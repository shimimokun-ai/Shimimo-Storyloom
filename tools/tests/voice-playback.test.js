const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const SPEAKER_MERGE = { traveler_costume: 'player' };

function setup(speakerId = 'player', voiceEntry = null, location = 'scene:0') {
    const state = {
        language: 'zh', showPlayerSprite: false, enabled: true, voiceVolume: 0.9, playerVolume: 0.5,
        isVoiceEnabled(id) { assert.equal(id, speakerId); return this.enabled; },
        getEffectiveVoiceVolume(id) { assert.equal(id, speakerId); return this.voiceVolume * this.playerVolume; }
    };
    const audio = { calls: 0, paused: true, volume: 0, currentTime: 0,
        play() { this.calls++; this.paused = false; return Promise.resolve(); },
        pause() { this.paused = true; } };
    const entry = voiceEntry || { id: 'player_1435', speaker: 'player', src: 'assets/voice/player/player_1435.mp3' };
    const methods = vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../../js/services/audio-manager.js'), 'utf8')
        + '\nAudioManagerMethods', { RuntimeState: state, GameConfig: require('../../js/config'), console,
        performance: { now: () => 0 }, setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {},
        Audio: function () { return audio; },
        VoiceManifest: { entries: { [location]: entry }, speakerAliases: SPEAKER_MERGE } });
    const [scene, index] = location.split(':');
    const engine = Object.assign({ currentSceneLanguage: 'zh', currentSceneId: scene, currentIndex: Number(index) }, methods);
    engine.initializeVoicePlayer();
    return { engine, audio, state, entry };
}

test('protagonist and alternate outfit scenes use the same voice independently of sprite visibility', () => {
    const h = setup();
    assert.equal(h.engine.playVoiceForDialogue('scene', 0, 'traveler_costume'), h.entry);
    assert.equal(h.audio.calls, 1);
    assert.equal(h.audio.volume, 0.45);
    assert.equal(h.engine.currentVoiceEntry.speaker, 'player');
    assert.equal(h.engine.playVoiceForDialogue('scene', 0, 'player'), h.entry);
    assert.equal(h.audio.calls, 2);
});

test('protagonist voice toggle and per-character volume apply to both outfits', () => {
    const h = setup();
    h.engine.playVoiceForDialogue('scene', 0, 'traveler_costume');
    h.state.playerVolume = 0.25;
    h.engine.setCurrentVoiceVolume();
    assert.equal(h.audio.volume, 0.225);
    h.state.enabled = false;
    assert.equal(h.engine.playVoiceForDialogue('scene', 0, 'traveler_costume'), null);
    assert.equal(h.audio.calls, 1);
    assert.equal(h.engine.isCurrentVoiceFinished(), true);
});

test('Chinese protagonist recordings do not play in other story languages or for the wrong character', () => {
    const h = setup();
    for (const language of ['ja', 'en']) {
        h.state.language = language;
        assert.equal(h.engine.playVoiceForDialogue('scene', 0, 'player'), null);
    }
    h.state.language = 'zh';
    h.engine.currentSceneLanguage = 'en';
    assert.equal(h.engine.playVoiceForDialogue('scene', 0, 'player'), null);
    h.engine.currentSceneLanguage = 'zh';
    assert.equal(h.engine.playVoiceForDialogue('scene', 0, 'guide'), null);
    assert.equal(h.audio.calls, 0);
});

