const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { loadProject, validate } = require('../check-project');
const { audit } = require('../audit-source');
const root = path.resolve(__dirname, '../..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');

test('the shipped project has valid scripts, references and translations', () => {
    assert.deepEqual(validate().errors, []);
    assert.deepEqual(audit().errors, []);
});
test('both sample branches preserve their flag through the second chapter', () => {
    const { stories } = loadProject();
    for (const language of Object.keys(stories)) for (const [branch, expected] of [['lights', 'ending_lights'], ['conversation', 'ending_talk']]) {
        const flags = new Map();
        for (const command of stories[language][branch]) if (command.type === 'setFlag') flags.set(command.key, command.value);
        const check = stories[language].ending[0];
        assert.equal(flags.get(check.key) === check.value ? check.targetTrue : check.targetFalse, expected);
        assert.equal(stories[language].credits.at(-1).type, 'sceneEnd');
    }
});
test('project identifiers isolate settings, flags and clear-data operations', () => {
    const values = new Map([['unrelated_setting', 'keep']]);
    const storage = { get length() { return values.size; }, key: index => [...values.keys()][index], getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    const context = vm.createContext({ console, GameConfig: { project: { id: 'test-story-a' } }, window: { localStorage: storage, sessionStorage: storage } });
    vm.runInContext(source('js/services/save-manager.js') + '\nSaveManager.set("flag_chosen", true);', context);
    assert.equal(values.get('test-story-a_flag_chosen'), 'true');
    vm.runInContext('SaveManager.clearGameData()', context);
    assert.equal(values.get('unrelated_setting'), 'keep');
    assert.equal(values.has('test-story-a_flag_chosen'), false);
});
test('chapter titles and custom start scenes are read from configuration', () => {
    const config = { project: { startScene: 'custom_entry' }, chapters: [{ id: 'custom-chapter', scene: 'custom_entry', zh: '自定义', en: 'Custom' }], languages: { en: {} } };
    const context = vm.createContext({ window: {}, GameConfig: config, RuntimeState: { language: 'en' } });
    vm.runInContext(source('js/engine.js').split('Object.assign(')[0] + '\nglobalThis.Engine = GameEngine;', context);
    const chapters = context.Engine.prototype.getChapterList.call({});
    assert.equal(chapters[0].id, 'custom-chapter');
    assert.equal(chapters[0].title, 'Custom');
});
test('persisted flags retain boolean, number, string, array and object types', () => {
    const values = new Map();
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const context = vm.createContext({ console, window: { localStorage: storage, sessionStorage: storage } });
    vm.runInContext(source('js/config.js') + '\n' + source('js/services/save-manager.js') + '\n' + source('js/core/runtime-state.js'), context);
    for (const value of [true, false, 0, 17, 'true', 'hello', [1, 2], { choice: false }, null]) {
        context.value = value;
        const result = vm.runInContext('RuntimeState.setFlag("chosen", value); RuntimeState.getFlag("chosen")', context);
        assert.deepEqual(JSON.parse(JSON.stringify(result)), value);
    }
});
test('source audit rejects a media file even if it is UTF-8 text', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'galgame-source-audit-'));
    const file = path.join(directory, 'private-art.png');
    try { fs.writeFileSync(file, 'placeholder'); assert.ok(audit(directory).errors.some(message => message.includes('private-art.png'))); }
    finally { fs.unlinkSync(file); fs.rmdirSync(directory); }
});
test('local achievement events are idempotent and ignore unknown IDs', () => {
    const catalog = require('../../js/data/achievements');
    const state = catalog.normalize(null);
    assert.deepEqual(catalog.apply(state, { type: 'unlock', id: 'story_complete' }), ['story_complete']);
    assert.deepEqual(catalog.apply(state, { type: 'unlock', id: 'story_complete' }), []);
    assert.deepEqual(catalog.apply(state, { type: 'unlock', id: 'unknown' }), []);
});
