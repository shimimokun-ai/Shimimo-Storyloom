const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function target(id) {
    const handlers = new Map();
    return { id, addEventListener(type, fn) { if (!handlers.has(type)) handlers.set(type, new Set()); handlers.get(type).add(fn); },
        removeEventListener(type, fn) { handlers.get(type)?.delete(fn); },
        dispatch(type, event = {}) { for (const fn of [...(handlers.get(type) || [])]) fn({ preventDefault() {}, ...event }); } };
}

const { arcade } = require('./helpers/arcade');

function playChart(h, count = 10) {
    const keys = ['KeyA', 'KeyS', 'KeyD', 'KeyS', 'KeyA', 'KeyD', 'KeyS', 'KeyA', 'KeyS', 'KeyD'];
    const beats = [4, 5, 6, 7, 8, 9, 10, 11.5, 13, 14];
    for (let index = 0; index < count; index++) {
        h.run(60, (beats[index] * 60000 / 104 - h.probe.time) / 1000);
        h.tap(keys[index]);
    }
    h.run(60, (9000 - h.probe.time) / 1000);
}

test('fighting movement, jump physics and AI match at 30, 60 and 144 Hz', () => {
    const results = [30, 60, 144].map(hz => {
        const h = arcade('fighting-game'); h.start();
        h.key('KeyD'); h.tap('Space'); h.run(hz, 0.5);
        return JSON.parse(JSON.stringify({ player: h.probe.player, enemy: h.probe.enemy, time: h.probe.time }));
    });
    assert.deepEqual(results[0], results[1]); assert.deepEqual(results[1], results[2]);
    assert.ok(Math.abs(results[0].player.x - 370) < 1e-8, '220 logical pixels per second');
    assert.ok(results[0].player.y < 446, 'jump is still airborne at half a second');
    assert.ok(results[0].enemy.x < 700, 'the rival approaches');
});

test('snowball movement, spawning and round timing match at 30, 60 and 144 Hz', () => {
    const results = [30, 60, 144].map(hz => {
        const h = arcade('dodgeball-game'); h.start(); h.key('KeyD'); h.run(hz, 1);
        return JSON.parse(JSON.stringify({ player: h.probe.player, obstacles: h.probe.obstacles,
            time: h.probe.time, remaining: h.container.querySelector('.snow-course-time').textContent }));
    });
    assert.deepEqual(results[0], results[1]); assert.deepEqual(results[1], results[2]);
    assert.ok(results[0].player.lateral > 0); assert.equal(results[0].remaining, '9.0 s');
    assert.ok(results[0].obstacles.length > 0);
});

test('focus loss pauses simulation, clears held controls and requires explicit resume', () => {
    for (const file of ['fighting-game', 'dodgeball-game']) {
        const h = arcade(file); h.start(); h.key('KeyD'); h.run(60, 0.2);
        const moving = JSON.parse(JSON.stringify(h.probe.player)), time = h.probe.time;
        h.blur();
        if (file === 'dodgeball-game') {
            assert.equal(h.probe.player.lateral, moving.lateral);
            assert.equal(h.probe.player.vx, 0); assert.equal(h.probe.player.lean, 0);
        }
        const state = JSON.stringify(h.probe.player);
        h.run(60, 5);
        assert.equal(JSON.stringify(h.probe.player), state); assert.equal(h.probe.ui.phase, 'paused');
        assert.equal(Boolean(h.probe.ui.held.right), false);
        h.focus(); h.run(144, 1);
        assert.equal(JSON.stringify(h.probe.player), state); assert.equal(h.probe.time, time);
        h.proceed(); h.key('KeyA'); h.run(60, 1);
        assert.equal(h.probe.ui.phase, 'playing');
        assert.ok(Math.abs(h.probe.time - time - 1000) < 1e-7, 'no catch-up for hidden time');
        assert.ok(file === 'fighting-game' ? h.probe.player.x < JSON.parse(state).x
            : h.probe.player.lateral < JSON.parse(state).lateral);
    }
});

test('background visibility pauses the snowball countdown and cannot award an unattended win', () => {
    const h = arcade('dodgeball-game', { random: 0.9 }); h.start(); h.run(60, 1);
    h.hide(); h.run(60, 20);
    assert.equal(h.container.querySelector('.snow-course-time').textContent, '9.0 s');
    assert.deepEqual(h.awarded, []); h.show(); h.run(60, 1);
    assert.equal(h.container.querySelector('.snow-course-time').textContent, '9.0 s');
    h.proceed(); h.run(60, 1);
    assert.equal(h.container.querySelector('.snow-course-time').textContent, '8.0 s');
});

test('rhythm gaps, repeats and IME cannot consume notes; wrong taps break combo without ending a session', () => {
    const h = arcade('rhythm-game'); h.start(); h.tap('KeyS');
    assert.equal(h.stat('notes'), '0 / 10'); assert.equal(h.probe.ui.phase, 'playing');
    h.run(60, 4 * 60 / 104);
    h.tap('KeyA', { repeat: true }); h.tap('KeyA', { isComposing: true });
    assert.equal(h.stat('notes'), '0 / 10');
    h.tap('KeyA'); assert.equal(h.stat('notes'), '1 / 10'); assert.equal(h.stat('combo'), '1');
    h.tap('KeyD'); assert.equal(h.stat('notes'), '1 / 10'); assert.equal(h.stat('combo'), '0');
    assert.equal(h.probe.ui.phase, 'playing'); assert.deepEqual(h.loaded, []);
    h.run(60, 7); assert.equal(h.probe.ui.phase, 'ended'); assert.deepEqual(h.awarded, []);
    h.proceed(); assert.deepEqual(h.loaded, ['fail']);
});

test('rhythm standard requires eight hits, relaxed requires seven, and ten hits award once', () => {
    for (const [relaxed, hits, win] of [[false, 10, true], [false, 8, true], [false, 7, false],
        [true, 7, true], [true, 6, false], [false, 0, false]]) {
        const h = arcade('rhythm-game', { relaxed }); h.start(); playChart(h, hits);
        assert.equal(h.stat('notes'), `${hits} / 10`);
        assert.equal(h.probe.ui.phase, 'ended');
        assert.deepEqual(h.awarded, win ? ['rhythm_win'] : []);
        h.run(60, 3); h.tap('KeyA'); assert.deepEqual(h.awarded, win ? ['rhythm_win'] : []);
        assert.deepEqual(h.loaded, [], 'results remain visible until Continue');
        h.proceed(); assert.deepEqual(h.loaded, [win ? 'success' : 'fail']);
    }
});

test('rhythm note deadlines pause on focus loss and retain their remaining timing after resume', () => {
    for (const hz of [30, 60, 144]) {
        const h = arcade('rhythm-game'); h.start(); h.run(hz, 2);
        const time = h.probe.time;
        h.blur(); h.run(hz, 5); assert.equal(h.probe.time, time); assert.deepEqual(h.loaded, []);
        h.focus(); h.run(hz, 1); assert.equal(h.probe.time, time);
        h.proceed(); h.run(hz, 0.3); h.tap('KeyA');
        assert.equal(h.stat('notes'), '1 / 10'); assert.equal(h.stat('timing'), 'PERFECT');
    }
});

function ui() {
    const nodes = new Map();
    const document = { body: { dataset: {} }, activeElement: null };
    function element(tag = 'div', id = '') {
        const el = Object.assign(target(id), { tagName: tag.toUpperCase(), children: [], inert: false, hidden: false,
            disabled: false, isConnected: true, tabIndex: tag === 'button' ? 0 : -1, attributes: {}, style: {},
            classList: { add() {}, remove() {} }, setAttribute(key, value) { this.attributes[key] = value; },
            appendChild(child) { child.parentElement = this; this.children.push(child); },
            querySelectorAll() { return this.children.filter(child => child.tagName === 'BUTTON'); },
            querySelector() { return this.querySelectorAll()[0] || null; }, getClientRects: () => [{}],
            focus() { document.activeElement = this; },
            closest(selector) {
                if (selector.includes('[inert]') || selector.includes('[hidden]')) {
                    for (let parent = this; parent; parent = parent.parentElement) if (parent.inert || parent.hidden) return parent;
                    return null;
                }
                return ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'].includes(this.tagName) ? this : null;
            }
        });
        Object.defineProperty(el, 'innerHTML', { set() { this.children = []; } });
        if (id) nodes.set(id, el);
        return el;
    }
    document.body = element('body'); document.body.dataset = {};
    document.activeElement = document.body;
    document.getElementById = id => nodes.get(id); document.createElement = tag => element(tag);
    const context = { window: {}, document, console };
    for (const name of ['AudioManagerMethods', 'LocalizationMethods', 'GalleryMethods', 'LoadMenuMethods', 'SettingsMethods',
        'HistoryMethods', 'ModalMethods', 'MessageInterfaceMethods', 'EndingCreditsMethods', 'RhythmGameMethods', 'FightingGameMethods', 'DodgeballGameMethods', 'WritingGameMethods']) context[name] = {};
    vm.runInNewContext(read('js/core/game-state.js') + '\n' + read('js/engine.js') + '\nthis.Engine = GameEngine;', context);
    const engine = Object.assign(Object.create(context.Engine.prototype), { gameState: 'dialogue', stateReturnPoints: new Map(),
        choiceBox: element(), dialogueBox: element(), uiLayer: element(), advances: 0,
        handleInput() { this.advances++; }, loadScene(scene) { this.loaded = scene; } });
    for (const id of ['setting-modal', 'confirm-modal']) {
        const overlay = element('div', id); overlay.inert = true;
        overlay.appendChild(element('button')); overlay.appendChild(element('button')); engine.uiLayer.appendChild(overlay);
    }
    const background = element('button'); engine.uiLayer.appendChild(background);
    return { engine, document, nodes, background, element,
        key: extra => engine.handleGameKeydown({ key: 'Enter', code: 'Enter', target: document.body, preventDefault() {}, ...extra }) };
}

test('dialogue shortcuts exclude focused controls, repeats, IME, modifiers and already-handled events', () => {
    const h = ui();
    for (const event of [{ target: h.background }, { repeat: true }, { isComposing: true }, { ctrlKey: true }, { defaultPrevented: true }]) h.key(event);
    assert.equal(h.engine.advances, 0); h.key({}); assert.equal(h.engine.advances, 1);
    h.key({ key: ' ', code: 'Space' }); assert.equal(h.engine.advances, 2);
});

test('story choices support initial focus, arrows, Home, End and native button activation', () => {
    const h = ui(); h.engine.showChoices([{ text: 'A', target: 'a' }, { text: 'B', target: 'b' }]);
    const [a, b] = h.engine.choiceBox.children;
    assert.equal(a.tagName, 'BUTTON'); assert.equal(h.document.activeElement, a);
    a.dispatch('keydown', { key: 'ArrowDown' }); assert.equal(h.document.activeElement, b);
    b.dispatch('keydown', { key: 'Home' }); assert.equal(h.document.activeElement, a);
    a.dispatch('keydown', { key: 'End' }); assert.equal(h.document.activeElement, b);
    h.key({ target: b }); assert.equal(h.engine.advances, 0); b.onclick(); assert.equal(h.engine.loaded, 'b');
});

test('nested overlays trap Tab, disable the background and restore focus and state when closed', async () => {
    const h = ui(); h.background.focus(); h.engine.enterOverlay('settings'); await Promise.resolve();
    const settings = h.nodes.get('setting-modal'), confirm = h.nodes.get('confirm-modal');
    assert.equal(h.background.inert, true); assert.equal(settings.inert, false);
    assert.equal(h.document.activeElement, settings.children[0]);
    h.key({ key: 'Tab', repeat: true }); assert.equal(h.document.activeElement, settings.children[1]);
    h.key({ key: 'Tab' }); assert.equal(h.document.activeElement, settings.children[0]);
    h.key({ key: 'Tab', shiftKey: true }); assert.equal(h.document.activeElement, settings.children[1]);
    h.engine.enterOverlay('confirm-modal'); await Promise.resolve();
    assert.equal(settings.inert, true); assert.equal(confirm.inert, false);
    h.engine.leaveOverlay('confirm-modal'); assert.equal(h.document.activeElement, settings.children[1]);
    assert.equal(h.engine.gameState, 'modal');
    h.engine.leaveOverlay('settings'); assert.equal(h.document.activeElement, h.background);
    assert.equal(h.background.inert, false); assert.equal(settings.inert, true); assert.equal(confirm.inert, true);
    assert.equal(h.engine.gameState, 'dialogue');
});
