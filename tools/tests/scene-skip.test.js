const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function harness() {
    const timers = new Map(), flags = new Map(), saved = new Map(), started = [], loaded = [];
    let nextId = 0;
    const node = () => {
        const classes = new Set();
        return { style: {}, innerText: '', innerHTML: '', children: [], classList: {
            add: value => classes.add(value), remove: value => classes.delete(value),
            contains: value => classes.has(value)
        } };
    };
    const document = { body: { dataset: {}, removeEventListener() {} }, getElementById: () => null };
    const context = vm.createContext({ document, console,
        setTimeout(callback) { const id = ++nextId; timers.set(id, callback); return id; },
        setInterval(callback) { const id = ++nextId; timers.set(id, callback); return id; },
        clearTimeout: id => timers.delete(id), clearInterval: id => timers.delete(id),
        AchievementManager: { meet() {}, unlock() {} }, AchievementCatalog: { storyAchievement() {} },
        GameConfig: { characters: {}, textSpeed: 30, features: { minigames: true } },
        RuntimeState: { language: 'zh', setFlag: (key, value) => flags.set(key, value), getFlag: key => flags.get(key) },
        SaveManager: { set: (key, value) => saved.set(key, value) },
        StoryRepository: { async getScene(_language, id) { loaded.push(id); return [{ type: 'dialogue', speaker: 'system', text: 'After game' }]; } }
    });
    vm.runInContext(read('js/core/game-state.js') + '\n' + read('js/core/command-handlers.js') + '\n'
        + read('js/engine.js').split('Object.assign(')[0] + '\nthis.Engine = GameEngine;', context);
    const engine = Object.assign(Object.create(context.Engine.prototype), {
        gameState: 'dialogue', currentIndex: 0, sceneLoadToken: 0, currentSceneId: 'before',
        currentScene: [], nameBox: node(), textBox: node(), dialogueBox: node(), choiceBox: node(), autoBtn: node(),
        stopVoice() {}, stopAllSoundEffects() {}, resetNonSpeakers() {},
        showDialogue(command) { this.textBox.innerText = command.text; this.dialogueBox.classList.remove('hidden'); },
        startRhythmGame(success, fail) { started.push(['minigame', success, fail]); this.setGameState('minigame'); },
        startFightingGame(target) { started.push(['fighting', target]); this.setGameState('minigame'); },
        startDodgeballGame() { started.push(['dodgeball']); this.setGameState('minigame'); },
        startWritingGame() { started.push(['writing']); this.setGameState('minigame'); },
        showChoices(options) { started.push(['choice', options]); this.setGameState('choice'); },
        showSystemModal(text) { throw new Error(text); }, t: key => key
    });
    return { engine, context, timers, flags, saved, started, loaded,
        beginTyping() { engine.typeText('Before game'); engine.isAutoPlaying = true;
            engine.autoBtn.classList.add('active'); engine.autoTimeout = context.setTimeout(() => {}); } };
}

test('SKIP enters terminal rhythm/fighting games in the actual three-language chapters and resumes afterward', async () => {
    for (const language of ['zh', 'ja', 'en']) for (const gameScene of ['arcade_rhythm', 'arcade_fight']) {
        const h = harness(), scenes = {};
        vm.runInNewContext(read(`js/story/${language}/chapter-02.js`), {
            StoryRepository: { registerChapter(_lang, _chapter, contents) { Object.assign(scenes, contents); } }
        });
        const scene = [{ type: 'dialogue', speaker: 'system', text: 'Before game' }, ...scenes[gameScene]];
        assert.ok(scene);
        h.engine.currentScene = scene;
        h.engine.currentIndex = scene.findIndex(command => command.type === 'dialogue');
        h.beginTyping();
        h.engine.skipToNextScene();
        const boundary = scene.at(-1);
        assert.equal(h.engine.currentIndex, scene.length - 1, 'does not move beyond the terminal game command');
        assert.equal(h.started[0][0], boundary.type);
        assert.equal(h.engine.gameState, 'minigame');
        assert.equal(h.engine.isAutoPlaying, false);
        assert.equal(h.engine.isTypingLocked, false);
        assert.equal(h.engine.autoBtn.classList.contains('active'), false);
        assert.equal(h.timers.size, 0, 'old text, auto and typing-lock timers are removed');
        h.engine.skipToNextScene();
        assert.equal(h.started.length, 1, 'SKIP cannot restart an active game');
        await h.engine.loadScene(boundary.targetSuccess || boundary.targetNext);
        assert.equal(h.engine.currentIndex, 0);
        assert.equal(h.engine.gameState, 'dialogue');
        assert.equal(h.engine.textBox.innerText, 'After game');
    }
});

test('SKIP stops at inline games, choices and flag branches without discarding story flags', () => {
    for (const type of ['dodgeball', 'writing']) {
        const h = harness();
        h.engine.currentScene = [{ type: 'dialogue', speaker: 'system', text: 'Before' }, { type },
            { type: 'dialogue', speaker: 'system', text: 'After' }, { type: 'jump', target: 'later' }];
        h.engine.skipToNextScene();
        assert.equal(h.started[0][0], type);
        assert.equal(h.engine.currentIndex, 1);
        assert.equal(h.engine.gameState, 'minigame');
    }
    const choice = harness();
    choice.engine.currentScene = [{ type: 'dialogue', speaker: 'system', text: 'Before' },
        { type: 'choice', options: [{ text: 'Choose', target: 'later' }] }, { type: 'jump', target: 'wrong' }];
    choice.engine.skipToNextScene();
    assert.equal(choice.engine.gameState, 'choice');
    assert.equal(choice.loaded.length, 0, 'never picks an option for the player');
    const branch = harness();
    branch.engine.loadScene = id => branch.loaded.push(id);
    branch.engine.currentScene = [{ type: 'dialogue', speaker: 'system', text: 'Before' },
        { type: 'setFlag', key: 'saved', value: true }, { type: 'unlockGallery' },
        { type: 'checkFlag', key: 'saved', value: true, targetTrue: 'correct', targetFalse: 'wrong' }];
    branch.engine.skipToNextScene();
    assert.deepEqual(branch.loaded, ['correct']);
    assert.equal(branch.saved.get('gallery_unlocked'), true);
});

test('scene loading blocks rapid SKIP/manual clicks and cancels the previous line timers', async () => {
    const h = harness();
    let complete, pending;
    const loadScene = h.engine.loadScene;
    h.engine.loadScene = id => { pending = loadScene.call(h.engine, id); return pending; };
    h.context.StoryRepository.getScene = (_language, id) => {
        h.loaded.push(id);
        return new Promise(resolve => { complete = resolve; });
    };
    h.engine.currentScene = [{ type: 'dialogue', speaker: 'system', text: 'Old text' }, { type: 'jump', target: 'next' }];
    h.beginTyping();
    h.engine.skipToNextScene();
    assert.equal(h.engine.gameState, 'transition');
    h.engine.skipToNextScene();
    h.engine.handleInput();
    assert.deepEqual(h.loaded, ['next']);
    assert.equal(h.engine.currentIndex, 1);
    assert.equal(h.timers.size, 0);
    complete([{ type: 'dialogue', speaker: 'system', text: 'New text' }]);
    await pending;
    assert.equal(h.engine.gameState, 'dialogue');
    assert.equal(h.engine.currentIndex, 0);
    assert.equal(h.engine.textBox.innerText, 'New text');
});

test('SKIP preserves readable text when a scene has no continuation boundary', () => {
    const h = harness();
    h.engine.currentScene = [{ type: 'dialogue', speaker: 'system', text: 'Before game' }];
    h.beginTyping();
    h.engine.skipToNextScene();
    assert.equal(h.engine.currentIndex, 0);
    assert.equal(h.engine.textBox.innerText, 'Before game');
    assert.equal(h.engine.isTextFinished, true);
    assert.equal(h.engine.isAutoPlaying, false);
});
