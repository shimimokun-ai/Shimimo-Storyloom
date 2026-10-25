const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

// Only browser surfaces and time are doubled. ArcadeKit, ActivityScope and all
// game rules run from production sources; no Electron, media or real timers run.
function eventTarget() {
    const listeners = new Map();
    return {
        addEventListener(type, fn) {
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type).add(fn);
        },
        removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
        dispatch(type, input = {}) {
            const event = { target: this, button: 0, detail: 1, pointerId: 1,
                preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {}, ...input };
            for (const fn of [...(listeners.get(type) || [])]) fn(event);
            return event;
        }
    };
}

function createDOM(drawing) {
    const document = Object.assign(eventTarget(), { hidden: false, activeElement: null });
    function matches(node, selector) {
        const parts = selector.trim().split(/\s+/);
        const simple = (el, part) => {
            if (part.includes(':not(:disabled)') && el.disabled) return false;
            part = part.replace(':not(:disabled)', '');
            const tag = part.match(/^[\w-]+/)?.[0];
            if (tag && el.tagName !== tag.toUpperCase()) return false;
            for (const [, name] of part.matchAll(/\.([\w-]+)/g)) if (!el.classList.contains(name)) return false;
            for (const [, name, value] of part.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) {
                const actual = name.startsWith('data-') ? el.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())]
                    : name === 'tabindex' ? String(el.tabIndex) : el.attributes[name];
                if (actual === undefined || (value !== undefined && actual !== value)) return false;
            }
            return true;
        };
        if (!simple(node, parts.pop())) return false;
        while (parts.length) {
            const part = parts.pop(); node = node.parentElement;
            while (node && !simple(node, part)) node = node.parentElement;
            if (!node) return false;
        }
        return true;
    }
    const element = (tag = 'div', id = '') => {
        const capture = new Set();
        const node = Object.assign(eventTarget(), { id, tagName: tag.toUpperCase(), className: '',
            children: [], attributes: {}, dataset: {}, hidden: false, disabled: false, inert: false,
            width: 960, height: 540, offsetWidth: 960, offsetHeight: 540, clientWidth: 960, clientHeight: 540,
            textContent: '', style: { setProperty(key, value) { this[key] = value; } },
            get isConnected() { return true; },
            setAttribute(key, value) { this.attributes[key] = String(value); },
            getAttribute(key) { return this.attributes[key]; }, removeAttribute(key) { delete this.attributes[key]; },
            append(...nodes) { for (const child of nodes) { child.remove(); child.parentElement = this; this.children.push(child); } },
            appendChild(child) { this.append(child); return child; },
            prepend(...nodes) { for (const child of [...nodes].reverse()) { child.remove(); child.parentElement = this; this.children.unshift(child); } },
            replaceChildren(...nodes) { this.children.forEach(child => { child.parentElement = null; }); this.children = []; this.append(...nodes); },
            before(child) { const parent = this.parentElement; child.remove(); child.parentElement = parent; parent.children.splice(parent.children.indexOf(this), 0, child); },
            remove() { if (this.parentElement) { const siblings = this.parentElement.children; siblings.splice(siblings.indexOf(this), 1); this.parentElement = null; } },
            contains(child) { return child === this || this.children.some(node => node.contains(child)); },
            querySelectorAll(selector) {
                const result = [];
                const visit = node => { for (const child of node.children) { if (selector.split(',').some(part => matches(child, part))) result.push(child); visit(child); } };
                visit(this); return result;
            },
            querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
            closest(selector) { for (let item = this; item; item = item.parentElement) if (matches(item, selector)) return item; return null; },
            focus() { document.activeElement = this; },
            click() { if (!this.disabled) this.dispatch('click'); },
            setPointerCapture(id) { capture.add(id); }, hasPointerCapture(id) { return capture.has(id); },
            releasePointerCapture(id) { capture.delete(id); },
            getContext: () => drawing,
            getBoundingClientRect() { return this.rect || { left: 0, top: 0, width: this.offsetWidth, height: this.offsetHeight, right: this.offsetWidth, bottom: this.offsetHeight }; }
        });
        node.classList = {
            contains: name => node.className.split(/\s+/).includes(name),
            add(...names) { node.className = [...new Set([...node.className.split(/\s+/).filter(Boolean), ...names])].join(' '); },
            remove(...names) { node.className = node.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); },
            toggle(name, force) { const add = force ?? !this.contains(name); if (add) this.add(name); else this.remove(name); }
        };
        return node;
    };
    document.body = element('body'); document.body.dataset = {};
    document.createElement = element;
    document.getElementById = id => {
        const visit = node => node.id === id ? node : node.children.map(visit).find(Boolean);
        return visit(document.body) || null;
    };
    document.querySelector = selector => document.body.querySelector(selector);
    document.querySelectorAll = selector => document.body.querySelectorAll(selector);
    return { document, element };
}

function arcade(file, { random = 0.2, relaxed = false } = {}) {
    let now = 0, nextId = 0, focused = true;
    const frames = new Map(), timers = new Map(), awarded = [], loaded = [];
    const drawing = new Proxy({ lines: [], moveTo(x, y) { this.lastMove = [x, y]; },
        lineTo(x, y) { if (this.strokeStyle === '#292b37') this.lines.push({ from: this.lastMove, to: [x, y], color: this.strokeStyle }); },
        measureText: text => ({ width: String(text).length * 8 })
    }, { get: (object, key) => object[key] ?? (() => ({ addColorStop() {} })) });
    const { document, element } = createDOM(drawing);
    const window = Object.assign(eventTarget(), { matchMedia: () => ({ matches: true }), devicePixelRatio: 1 });
    document.defaultView = window; document.hasFocus = () => focused;
    const names = { 'fighting-game': ['fight', 'FightingGameMethods', 'startFightingGame'],
        'dodgeball-game': ['dodgeball', 'DodgeballGameMethods', 'startDodgeballGame'],
        'rhythm-game': ['rhythm', 'RhythmGameMethods', 'startRhythmGame'],
        'writing-game': ['writing', 'WritingGameMethods', 'startWritingGame'] };
    const [kind, variable, method] = names[file];
    const container = element('div', `${file.replace('-game', '')}-game-container`);
    const canvas = element('canvas', `${kind}-canvas`);
    if (kind === 'writing') { canvas.width = 300; canvas.height = 500; canvas.offsetWidth = 300; canvas.offsetHeight = 500; }
    container.append(canvas); document.body.append(container);
    class Image {
        constructor() { Object.assign(this, eventTarget()); this.complete = true; this.naturalWidth = 800; this.naturalHeight = 100; }
        set src(value) { this.source = value; this.dispatch('load'); }
        get src() { return this.source; }
        removeAttribute() {}
    }
    const math = Object.create(Math); math.random = () => random;
    const context = vm.createContext({ window, document, Image, Math: math, console,
        performance: { now: () => now }, Date: { now: () => now },
        RuntimeState: { language: 'en', seVolume: 0 }, GameConfig: require('../../../js/config'),
        SaveManager: { get: (_key, fallback) => relaxed ? 'relaxed' : fallback, set() {} },
        setTimeout(fn, delay) { const id = ++nextId; timers.set(id, { fn, at: now + delay }); return id; },
        clearTimeout: id => timers.delete(id), clearInterval: id => timers.delete(id),
        requestAnimationFrame(fn) { const id = ++nextId; frames.set(id, fn); return id; },
        cancelAnimationFrame: id => frames.delete(id),
        AchievementManager: { unlock: id => awarded.push(id) } });
    for (const source of ['js/core/game-state.js', 'js/services/activity-scope.js', 'js/minigames/arcade-kit.js']) vm.runInContext(read(source), context);
    const Scope = vm.runInContext('ActivityScope', context);
    const engine = { currentIndex: 0, processed: 0, dialogueBox: element(), charLayer: element(),
        setGameState(state) { this.gameState = state; }, stopVoice() {}, stopAllSoundEffects() {},
        updateBgmVolume() {}, characterName: id => id, t: key => key,
        beginActivity() { this.activeScope?.clear(); return this.activeScope = new Scope(); },
        endActivity(scope = this.activeScope) { scope?.clear(); },
        loadScene: id => loaded.push(id), processCommand() { this.processed++; } };
    // Expose references only for deterministic state observation and terminal-HP
    // fixtures. Updates, input, results and achievement hooks remain unchanged.
    let source = read(`js/minigames/${file}.js`);
    if (kind !== 'writing') {
        const marker = 'ui.loop(update, draw);';
        assert.equal(source.split(marker).length, 2, 'one game loop probe boundary');
        const fields = kind === 'fight' ? 'ui, player, enemy, get time() { return time; }'
            : kind === 'dodgeball' ? 'ui, player, obstacles, get time() { return time; }'
                : 'ui, get time() { return time; }';
        source = source.replace(marker, `globalThis.gameProbe = { ${fields} }; ${marker}`);
    }
    Object.assign(engine, vm.runInContext(`${source}\n${variable}`, context));
    engine[method]('success', 'fail');
    const advance = ms => {
        const end = now + ms;
        for (;;) {
            const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
            if (!next) break;
            const [id, timer] = next; now = timer.at; timers.delete(id); timer.fn();
        }
        now = end;
    };
    const frame = timestamp => {
        advance(Math.max(0, timestamp - now));
        for (const [id, fn] of [...frames]) { frames.delete(id); fn(now); }
    };
    const h = { engine, context, document, window, canvas, container, drawing, awarded, loaded,
        get probe() { return context.gameProbe; },
        run(hz, seconds) { const start = now; frame(start); const count = Math.round(hz * seconds); for (let i = 1; i <= count; i++) frame(start + seconds * 1000 * i / count); },
        key(code, extra = {}) { document.dispatch('keydown', { code, key: code === 'Space' ? ' ' : code.replace('Key', '').toLowerCase(), target: canvas, ...extra }); },
        release(code) { document.dispatch('keyup', { code }); },
        tap(code, extra = {}) { this.key(code, extra); this.release(code); },
        start() { container.querySelector('.arcade-card-actions button').click(); this.run(60, 1.8); assert.equal(this.probe.ui.phase, 'playing'); },
        proceed() { container.querySelector('.arcade-card-actions button').click(); },
        stat(key) { return container.querySelector(`[data-stat="${key}"] strong`).textContent; },
        blur() { focused = false; window.dispatch('blur'); }, focus() { focused = true; window.dispatch('focus'); },
        hide() { document.hidden = true; document.dispatch('visibilitychange'); },
        show() { document.hidden = false; document.dispatch('visibilitychange'); }
    };
    return h;
}

module.exports = { arcade, createDOM, eventTarget };
