const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function harness() {
    let now = 0, nextTimer = 0;
    const timers = new Map(), nodes = new Map();
    const document = { body: { dataset: {} }, activeElement: null };
    function node(id, tag = 'div') {
        const classes = new Set(), listeners = new Map();
        const element = { id, tagName: tag.toUpperCase(), children: [], inert: false,
            isConnected: true, tabIndex: tag === 'button' ? 0 : -1, style: {},
            classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
            setAttribute() {}, getClientRects: () => [{}],
            querySelectorAll: () => element.children.filter(child => child.tagName === 'BUTTON'),
            appendChild(child) { child.parentNode = child.parentElement = element; element.children.push(child); },
            replaceChild(next, previous) {
                const index = element.children.indexOf(previous);
                element.children[index] = next;
                next.parentNode = next.parentElement = element;
                previous.isConnected = false;
            },
            cloneNode: () => node(id, tag),
            addEventListener(type, callback) { listeners.set(type, callback); },
            click() { listeners.get('click')?.(); },
            focus() { document.activeElement = element; },
            closest(selector) {
                if (selector.includes('[inert]')) {
                    for (let parent = element; parent; parent = parent.parentElement) {
                        if (parent.inert || parent.hidden) return parent;
                    }
                    return null;
                }
                return tag === 'button' ? element : null;
            }
        };
        nodes.set(id, element);
        return element;
    }
    document.getElementById = id => nodes.get(id);
    document.activeElement = node('menu-sw-btn', 'button');
    const context = vm.createContext({ console, document,
        setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, at: now + delay }); return id; },
        clearTimeout: id => timers.delete(id), clearInterval: id => timers.delete(id)
    });
    vm.runInContext(read('js/core/game-state.js') + '\n'
        + read('js/engine.js').split('Object.assign(')[0] + '\n'
        + read('js/ui/modals.js') + '\n' + read('js/ui/settings.js')
        + '\nObject.assign(GameEngine.prototype, ModalMethods, SettingsMethods); this.Engine = GameEngine;', context);
    const engine = Object.assign(Object.create(context.Engine.prototype), {
        gameState: 'dialogue', stateReturnPoints: new Map(), currentSceneId: 'start', currentIndex: 0,
        isAutoPlaying: true, isTyping: false, isTextFinished: true, voiceFinished: true,
        autoTimeout: null, advances: 0, confirmations: 0, cancellations: 0,
        uiLayer: node('ui-layer'), dialogueBox: node('dialogue-container'), textBox: node('text-box'),
        choiceBox: node('choice-container'), confirmModal: node('confirm-modal'), confirmText: node('confirm-text'),
        confirmOk: node('confirm-ok', 'button'), confirmCancel: node('confirm-cancel', 'button'),
        settingModal: node('setting-modal'), chatApiLoadVersion: 0, currentFullText: 'Current dialogue',
        renderVoiceCharacterSettings() {}, syncFullscreenToggle() {}, syncPlayerSpriteSetting() {},
        syncLanguageSetting() {}, refreshChatApiSettings() {},
        isCurrentVoiceFinished() { return this.voiceFinished; }, stopVoice() {},
        processCommand() { this.advances++; this.isTextFinished = false; }
    });
    engine.uiLayer.appendChild(engine.dialogueBox);
    engine.uiLayer.appendChild(engine.settingModal);
    engine.settingModal.appendChild(node('setting-close', 'button'));
    engine.uiLayer.appendChild(engine.confirmModal);
    engine.confirmModal.appendChild(engine.confirmOk);
    engine.confirmModal.appendChild(engine.confirmCancel);
    return { engine, timers,
        open() { engine.showConfirmModal('Return to title?', () => engine.confirmations++, () => engine.cancellations++); },
        advance(milliseconds) {
            const end = now + milliseconds;
            for (;;) {
                const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
                if (!next) break;
                const [id, timer] = next;
                now = timer.at;
                timers.delete(id);
                timer.callback();
            }
            now = end;
        }
    };
}

test('cancelling MENU resumes AUTO after the previous advance deadline passed', () => {
    const h = harness();
    h.engine.maybeScheduleAutoAdvance();
    assert.equal(h.timers.size, 1);
    h.open();
    h.advance(2000);
    assert.equal(h.engine.advances, 0);
    h.engine.confirmCancel.click();
    assert.equal(h.engine.cancellations, 1);
    assert.equal(h.engine.confirmations, 0);
    assert.equal(h.engine.isAutoPlaying, true);
    h.advance(999);
    assert.equal(h.engine.advances, 0);
    h.advance(1);
    assert.equal(h.engine.advances, 1);
});

test('Escape resumes AUTO when text and voice finish while MENU is open', () => {
    const h = harness();
    h.engine.isTyping = true;
    h.engine.isTextFinished = false;
    h.engine.voiceFinished = false;
    h.engine.currentFullText = 'Current dialogue';
    h.open();
    h.engine.finishTyping();
    h.engine.voiceFinished = true;
    h.engine.maybeScheduleAutoAdvance();
    assert.equal(h.timers.size, 0);
    let prevented = false;
    h.engine.handleGameKeydown({ key: 'Escape', code: 'Escape', preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(h.engine.gameState, 'dialogue');
    assert.equal(h.engine.confirmations, 0);
    h.advance(1000);
    assert.equal(h.engine.advances, 1);
});

test('cancelling waits for unfinished text or voice and never enables disabled AUTO', () => {
    for (const unfinished of ['text', 'voice', 'disabled']) {
        const h = harness();
        if (unfinished === 'text') { h.engine.isTyping = true; h.engine.isTextFinished = false; }
        if (unfinished === 'voice') h.engine.voiceFinished = false;
        if (unfinished === 'disabled') h.engine.isAutoPlaying = false;
        h.open();
        h.engine.confirmCancel.click();
        h.advance(2000);
        assert.equal(h.engine.advances, 0, unfinished);
        assert.equal(h.timers.size, 0, unfinished);
        if (unfinished === 'disabled') continue;
        h.engine.isTyping = false;
        h.engine.isTextFinished = true;
        h.engine.voiceFinished = true;
        h.engine.maybeScheduleAutoAdvance();
        h.advance(1000);
        assert.equal(h.engine.advances, 1, unfinished);
    }
});

test('cancelling a nested confirmation cannot advance behind its parent overlay', () => {
    const h = harness();
    h.engine.maybeScheduleAutoAdvance();
    h.engine.openSettings();
    h.open();
    h.engine.confirmCancel.click();
    assert.equal(h.engine.gameState, 'modal');
    assert.equal(h.engine.overlayFocusStack.at(-1).id, 'settings');
    assert.equal(h.engine.settingModal.classList.contains('visible'), true);
    h.advance(2000);
    assert.equal(h.engine.advances, 0);
    assert.equal(h.timers.size, 0);
    h.engine.closeSettings();
    h.advance(1000);
    assert.equal(h.engine.advances, 1, 'AUTO resumes only after the parent settings panel closes');
});

test('confirming return to title does not resume AUTO or retain its earlier timer', () => {
    for (const delay of [0, 2000]) {
        const h = harness();
        h.engine.maybeScheduleAutoAdvance();
        h.open();
        h.advance(delay);
        h.engine.confirmOk.click();
        assert.equal(h.engine.confirmations, 1);
        assert.equal(h.engine.cancellations, 0);
        assert.equal(h.timers.size, 0);
        h.advance(2000);
        assert.equal(h.engine.advances, 0);
    }
});

test('opening settings clears the pending AUTO deadline and closing starts a fresh delay', () => {
    const h = harness();
    h.engine.maybeScheduleAutoAdvance();
    h.advance(800);
    h.engine.openSettings();
    assert.equal(h.engine.gameState, 'modal');
    assert.equal(h.engine.autoTimeout, null);
    assert.equal(h.timers.size, 0);
    assert.equal(h.engine.isAutoPlaying, true);
    h.advance(2000);
    assert.equal(h.engine.advances, 0);
    h.engine.closeSettings();
    assert.equal(h.engine.gameState, 'dialogue');
    h.advance(999);
    assert.equal(h.engine.advances, 0);
    h.advance(1);
    assert.equal(h.engine.advances, 1);
});

test('closing settings or pressing Escape resumes AUTO when dialogue finishes inside the panel', () => {
    for (const escape of [false, true]) {
        const h = harness();
        h.engine.isTyping = true;
        h.engine.isTextFinished = false;
        h.engine.voiceFinished = false;
        h.engine.openSettings();
        h.engine.finishTyping();
        h.engine.voiceFinished = true;
        h.engine.maybeScheduleAutoAdvance();
        h.advance(2000);
        assert.equal(h.engine.advances, 0);
        assert.equal(h.timers.size, 0);
        if (escape) {
            let prevented = false;
            h.engine.handleGameKeydown({ key: 'Escape', code: 'Escape', preventDefault() { prevented = true; } });
            assert.equal(prevented, true);
        } else h.engine.closeSettings();
        assert.equal(h.engine.gameState, 'dialogue');
        assert.equal(h.engine.settingModal.classList.contains('visible'), false);
        h.advance(1000);
        assert.equal(h.engine.advances, 1);
    }
});

test('settings never skips unfinished text or voice and preserves disabled AUTO', () => {
    for (const unfinished of ['text', 'voice', 'disabled']) for (const escape of [false, true]) {
        const h = harness();
        if (unfinished === 'text') { h.engine.isTyping = true; h.engine.isTextFinished = false; }
        if (unfinished === 'voice') h.engine.voiceFinished = false;
        if (unfinished === 'disabled') h.engine.isAutoPlaying = false;
        h.engine.openSettings();
        if (escape) h.engine.handleGameKeydown({ key: 'Escape', code: 'Escape', preventDefault() {} });
        else h.engine.closeSettings();
        h.advance(2000);
        assert.equal(h.engine.advances, 0, unfinished);
        assert.equal(h.timers.size, 0, unfinished);
        if (unfinished === 'disabled') {
            assert.equal(h.engine.isAutoPlaying, false);
            continue;
        }
        if (unfinished === 'text') {
            assert.equal(h.engine.isTyping, true);
            h.engine.finishTyping();
        } else {
            assert.equal(h.engine.voiceFinished, false);
            h.engine.voiceFinished = true;
            h.engine.maybeScheduleAutoAdvance();
        }
        h.advance(1000);
        assert.equal(h.engine.advances, 1, unfinished);
    }
});

test('closing settings opened from the main menu cannot start story AUTO', () => {
    const h = harness();
    h.engine.gameState = 'menu';
    h.engine.openSettings();
    h.engine.closeSettings();
    assert.equal(h.engine.gameState, 'menu');
    assert.equal(h.timers.size, 0);
    h.advance(2000);
    assert.equal(h.engine.advances, 0);
});
