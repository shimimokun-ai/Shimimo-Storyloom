const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
    let now = 0, nextTimer = 0;
    const timers = new Map(), state = { bgmVolume: 1 };
    const methods = vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../../js/services/audio-manager.js'), 'utf8') + '\nAudioManagerMethods', {
        RuntimeState: state, GameConfig: { bgm: { first: 'first.mp3', second: 'second.mp3' } }, console,
        performance: { now: () => now }, setInterval(fn) { const id = ++nextTimer; timers.set(id, fn); return id; },
        clearInterval: id => timers.delete(id)
    });
    const bgm = { src: '', volume: 0, paused: true, play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; } };
    const engine = Object.assign({ bgm, currentTrackVolume: 0.5 }, methods);
    return { engine, bgm, state, tick(ms) { now += ms; for (const fn of [...timers.values()]) fn(); }, count: () => timers.size };
}

test('muting during fade-in remains silent through completion; unmuting follows the latest setting', () => {
    const h = setup(); h.engine.playBgm('first', 0.5); h.tick(100);
    assert.ok(h.bgm.volume > 0);
    h.state.bgmVolume = 0; h.engine.updateBgmVolume(); h.tick(100); assert.equal(h.bgm.volume, 0);
    h.tick(500); assert.equal(h.bgm.volume, 0); assert.equal(h.count(), 0);
    h.state.bgmVolume = 0.4; h.engine.updateBgmVolume(); assert.equal(h.bgm.volume, 0.2);
});

test('volume changes during track transitions and stop never restore an obsolete volume', () => {
    const h = setup(); h.engine.playBgm('first', 0.8); h.tick(500);
    h.engine.playBgm('second', 0.4); h.tick(100);
    h.state.bgmVolume = 0; h.engine.updateBgmVolume(); h.tick(500); h.tick(500);
    assert.equal(h.bgm.src, 'second.mp3'); assert.equal(h.bgm.volume, 0);
    h.state.bgmVolume = 0.5; h.engine.updateBgmVolume(); assert.equal(h.bgm.volume, 0.2);
    h.engine.playBgm('stop'); h.tick(200); h.state.bgmVolume = 1; h.engine.updateBgmVolume();
    assert.ok(h.bgm.volume <= 0.4); h.tick(500); assert.equal(h.bgm.volume, 0); assert.equal(h.bgm.paused, true);
});

test('a newer track replaces earlier fades without leaving extra timers or restoring the old track', () => {
    const h = setup(); h.engine.playBgm('first'); h.tick(100);
    h.engine.playBgm('second'); h.tick(100); h.engine.playBgm('first', 0.2);
    assert.equal(h.count(), 1); h.tick(500); h.tick(500);
    assert.equal(h.bgm.src, 'first.mp3'); assert.equal(h.bgm.volume, 0.2); assert.equal(h.count(), 0);
});
