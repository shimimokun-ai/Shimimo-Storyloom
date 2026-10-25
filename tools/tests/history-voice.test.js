const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8');

class Element {
    constructor() {
        this.children = [];
        this.listeners = new Map();
        this.attributes = new Map();
        this.style = {};
        this.className = '';
        this.classList = {
            contains: value => this.className.split(' ').includes(value),
            add: value => { if (!this.classList.contains(value)) this.className += ` ${value}`; },
            remove: value => { this.className = this.className.split(' ').filter(item => item !== value).join(' '); }
        };
    }
    set innerHTML(value) { this.children = []; this.html = value; }
    appendChild(child) { this.children.push(child); return child; }
    setAttribute(key, value) { this.attributes.set(key, value); }
    getAttribute(key) { return this.attributes.get(key); }
    addEventListener(type, callback) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type).add(callback);
    }
    removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
    fire(type) {
        for (const callback of this.listeners.get(type) || []) callback({ stopPropagation() {} });
    }
    click() { if (!this.disabled) this.fire('click'); }
}

function setup(log = []) {
    const document = Object.assign(new Element(), { hidden: false, createElement: () => new Element() });
    const window = new Element(), clips = [], timers = new Map(), ducking = [], storage = new Map();
    let timerId = 0, nextPlayResult;
    class Audio {
        constructor() { this.paused = true; this.volume = 1; this.calls = 0; this.ended = false; clips.push(this); }
        play() {
            this.calls++;
            this.paused = false;
            const result = nextPlayResult || Promise.resolve();
            nextPlayResult = undefined;
            return result;
        }
        pause() { this.paused = true; this.onpause?.(); }
        removeAttribute(key) { if (key === 'src') this.src = ''; }
        load() { this.released = true; }
    }
    const voices = {
        'old:3': { id: 'player_0001', speaker: 'player', src: 'assets/voice/player/player_0001.mp3' },
        'new:7': { id: 'player_0002', speaker: 'player', src: 'assets/voice/player/player_0002.mp3' }
    };
    const context = vm.createContext({ document, window, Audio,
        console: { warn() {}, log() {} },
        setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
        clearTimeout: id => timers.delete(id),
        SaveManager: { get: (key, fallback) => storage.has(key) ? storage.get(key) : fallback,
            set: (key, value) => storage.set(key, value) },
        VoiceManifest: { entries: voices, speakerAliases: { traveler_costume: 'player' } }
    });
    for (const file of ['js/config.js', 'js/core/runtime-state.js',
        'js/core/game-state.js', 'js/services/activity-scope.js', 'js/services/localization.js',
        'js/services/audio-manager.js', 'js/ui/history.js']) vm.runInContext(read(file), context, { filename: file });
    context.engine = { historyModal: new Element(), historyContent: new Element(), historyLog: log,
        currentSceneLanguage: 'zh', currentSceneId: 'new', currentIndex: 7, autoSchedules: 0,
        enterOverlay() { this.gameState = 'modal'; }, leaveOverlay() { this.gameState = 'dialogue'; },
        setVoiceDuckingActive(value) { ducking.push(value); },
        maybeScheduleAutoAdvance() { this.autoSchedules++; }
    };
    const duckingSpy = context.engine.setVoiceDuckingActive;
    vm.runInContext('Object.assign(engine, HistoryMethods, AudioManagerMethods, LocalizationMethods); engine.initializeVoicePlayer(); globalThis.state = RuntimeState;', context);
    context.engine.setVoiceDuckingActive = duckingSpy;
    const buttons = () => context.engine.historyContent.children.flatMap(row => row.children[1]?.children.slice(1) || []);
    return { engine: context.engine, state: context.state, context, document, window, clips, voices,
        timers, ducking, buttons, setPlayResult: result => { nextPlayResult = result; } };
}

const line = (sceneId = 'old', commandIndex = 3, overrides = {}) => ({ speaker: 'player', text: 'Same line',
    sceneId, commandIndex, language: 'zh', ...overrides });
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('only voiced Chinese history rows get buttons; disabled voices retain their recording link', () => {
    const h = setup([line(), line('old', 3, { speaker: 'system' }), line('old', 4),
        line('old', 3, { language: 'ja' }), { speaker: 'player', text: 'Legacy entry without location' }]);
    h.state.setVoiceEnabled('player', false);
    h.engine.openHistory();
    assert.equal(h.engine.historyContent.children.length, 5);
    assert.equal(h.buttons().length, 1);
    assert.equal(h.buttons()[0].disabled, true);
    assert.match(h.buttons()[0].title, /关闭/);
    h.state.setVoiceEnabled('player', true);
    h.engine.openHistory();
    assert.equal(h.buttons()[0].disabled, false);
    h.state.setLanguage('en');
    h.engine.openHistory();
    assert.equal(h.buttons().length, 0);
});

test('identical text and alternate outfit aliases resolve by the recorded scene and command index', () => {
    const h = setup();
    assert.equal(h.engine.getHistoryVoiceEntry(line()), h.voices['old:3']);
    assert.equal(h.engine.getHistoryVoiceEntry(line('new', 7, { speaker: 'traveler_costume' })), h.voices['new:7']);
    assert.equal(h.engine.getHistoryVoiceEntry(line('old', 3, { speaker: 'hina' })), null);
    assert.equal(h.engine.getHistoryVoiceEntry(line('old', 3, { commandIndex: '3' })), null);
    h.state.setLanguage('ja');
    assert.equal(h.engine.getHistoryVoiceEntry(line()), null);
});

test('showDialogue records a replayable location even when story voice is disabled', () => {
    const h = setup();
    const source = read('js/engine.js');
    vm.runInContext(source.slice(0, source.indexOf('\nObject.assign(')) + '\nglobalThis.showDialogue = GameEngine.prototype.showDialogue;', h.context);
    Object.assign(h.engine, { dialogueBox: new Element(), nameBox: new Element(), textBox: new Element(),
        setGameState(value) { this.gameState = value; }, toggleTalkingState() {}, focusCharacter() {}, typeText() {} });
    h.state.setVoiceEnabled('player', false);
    h.context.showDialogue.call(h.engine, { speaker: 'player', text: 'Test dialogue' });
    const entry = h.engine.historyLog[0];
    assert.equal(entry.sceneId, 'new');
    assert.equal(entry.commandIndex, 7);
    assert.equal(entry.language, 'zh');
    assert.equal(entry.voiceId, null);
    assert.equal(h.engine.getHistoryVoiceEntry(entry), h.voices['new:7']);
});

test('replay respects master and character volume, ducks BGM, and never advances the story', async () => {
    const h = setup([line('new', 7)]);
    h.state.setVoiceCharacterVolume('player', 0.5);
    h.engine.openHistory();
    const button = h.buttons()[0];
    button.click();
    await flush();
    const audio = h.clips.at(-1);
    assert.equal(audio.src, h.voices['new:7'].src);
    assert.equal(audio.volume, 0.35);
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.equal(h.ducking.at(-1), true);
    audio.ended = true;
    audio.onended();
    assert.equal(h.engine.currentIndex, 7);
    assert.equal(h.engine.currentSceneId, 'new');
    assert.equal(h.engine.autoSchedules, 0);
    assert.equal(button.getAttribute('aria-pressed'), 'false');
    assert.equal(h.ducking.at(-1), false);
    assert.equal(audio.released, true);
});

test('clicking the active row stops; switching rows ignores old end events and rejected play promises', async () => {
    const h = setup([line(), line('new', 7)]);
    h.engine.openHistory();
    let reject;
    h.setPlayResult(new Promise((resolve, fail) => { reject = fail; }));
    const [first, second] = h.buttons();
    first.click();
    const previous = h.clips.at(-1), oldEnded = previous.onended;
    second.click();
    const current = h.clips.at(-1);
    assert.equal(previous.paused, true);
    oldEnded();
    reject(new Error('Old request canceled'));
    await flush();
    assert.equal(h.engine.historyVoicePlayback.audio, current);
    assert.equal(second.getAttribute('aria-pressed'), 'true');
    assert.equal(first.getAttribute('aria-pressed'), 'false');
    second.click();
    assert.equal(current.paused, true);
    assert.equal(h.engine.historyVoicePlayback, null);
});

test('playback failures restore the button for retry and do not schedule AUTO', async () => {
    const h = setup([line()]);
    h.engine.openHistory();
    const button = h.buttons()[0];
    h.setPlayResult(Promise.reject(new Error('Missing recording')));
    button.click();
    await flush();
    assert.equal(h.engine.historyVoicePlayback, null);
    assert.match(button.textContent, /重试/);
    assert.equal(button.getAttribute('aria-pressed'), 'false');
    assert.equal(h.engine.autoSchedules, 0);
    button.click();
    await flush();
    assert.ok(h.engine.historyVoicePlayback);
});

test('zero volume prevents replay and live volume updates or muting affect the separate player', async () => {
    const h = setup([line()]);
    h.state.setVoiceVolume(0);
    h.engine.openHistory();
    assert.equal(h.buttons()[0].disabled, true);
    h.engine.playHistoryVoice(line(), h.buttons()[0]);
    assert.equal(h.clips.length, 1);
    h.state.setVoiceVolume(0.7);
    h.engine.openHistory();
    h.buttons()[0].click();
    await flush();
    const audio = h.clips.at(-1);
    h.state.setVoiceVolume(0.4);
    h.engine.setCurrentVoiceVolume();
    assert.equal(audio.volume, 0.4);
    h.state.setVoiceEnabled('player', false);
    h.engine.setCurrentVoiceVolume();
    assert.equal(audio.paused, true);
    assert.equal(h.buttons()[0].disabled, true);
});

test('hiding, closing, and story cleanup stop replay and dispose modal listeners and timers', () => {
    const h = setup([line()]);
    h.engine.openHistory();
    h.buttons()[0].click();
    const first = h.clips.at(-1);
    h.document.hidden = true;
    h.document.fire('visibilitychange');
    assert.equal(first.paused, true);
    h.document.hidden = false;
    h.buttons()[0].click();
    const second = h.clips.at(-1);
    h.engine.stopVoice({ scheduleAuto: false });
    assert.equal(second.paused, true);
    h.buttons()[0].click();
    const third = h.clips.at(-1);
    h.engine.closeHistory();
    assert.equal(third.paused, true);
    assert.equal(h.timers.size, 0);
    assert.equal(h.document.listeners.get('visibilitychange').size, 0);
    assert.equal(h.window.listeners.get('pagehide').size, 0);
    assert.equal(h.engine.gameState, 'dialogue');
    assert.equal(h.engine.autoSchedules, 1);
    assert.equal(h.engine.currentIndex, 7);
});

