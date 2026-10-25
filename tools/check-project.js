const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        if (['.git', 'node_modules', 'dist', 'output', 'coverage'].includes(entry.name)) return [];
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(file) : [file];
    });
}
function loadProject(root = ROOT) {
    const context = vm.createContext({ console });
    const read = file => fs.readFileSync(path.join(root, file), 'utf8');
    for (const file of ['js/config.js', 'js/story/story-repository.js', 'js/script.js', 'js/script_ja.js', 'js/script_en.js', 'js/generated/voice-manifest.js']) {
        vm.runInContext(read(file), context, { filename: file });
    }
    const config = vm.runInContext('GameConfig', context);
    const stories = {}, manifests = {};
    for (const language of Object.keys(config.languages)) {
        const manifest = vm.runInContext(`StoryRepository.getManifest(${JSON.stringify(language)})`, context);
        manifests[language] = manifest;
        for (const file of new Set(Object.values(manifest))) {
            if (!/^js\/story\/[a-z-]+\/[\w-]+\.js$/.test(file)) throw new Error(`Invalid story script path: ${file}`);
            vm.runInContext(read(file), context, { filename: file });
        }
        // Read registered scenes without making the CLI depend on browser script loading.
        const names = { zh: 'GameScript', ja: 'GameScriptJa', en: 'GameScriptEn' };
        stories[language] = vm.runInContext(names[language], context);
    }
    return { config, stories, manifests, voice: vm.runInContext('VoiceManifest', context) };
}
function commandStructure(command) {
    const value = { ...command };
    delete value.text;
    delete value.title;
    if (value.options) value.options = value.options.map(({ text, ...option }) => option);
    return JSON.stringify(value);
}
function validate(root = ROOT) {
    const errors = [];
    const files = walk(root);
    const jsFiles = files.filter(file => /\.(js|cjs)$/.test(file));
    for (const file of jsFiles) {
        try { new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file }); }
        catch (error) { errors.push(`${path.relative(root, file)}: ${error.message}`); }
    }
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);
    for (const match of html.matchAll(/(?:src|href)="((?:js|css)\/[^"?#]+)"/g)) {
        if (!fs.existsSync(path.join(root, match[1]))) errors.push(`Missing page dependency: ${match[1]}`);
    }
    if (new Set(scripts).size !== scripts.length) errors.push('Duplicate page scripts.');
    for (const [first, second] of [['js/config.js', 'js/services/save-manager.js'], ['js/services/save-manager.js', 'js/core/runtime-state.js'], ['js/story/story-repository.js', 'js/script.js'], ['js/core/command-handlers.js', 'js/engine.js']]) {
        if (!scripts.includes(first) || !scripts.includes(second) || scripts.indexOf(first) >= scripts.indexOf(second)) errors.push(`Script order: ${first} must precede ${second}`);
    }
    let project;
    try { project = loadProject(root); }
    catch (error) { errors.push(error.message); return { errors, jsFiles: jsFiles.length, sceneCount: 0 }; }
    const { config, stories, manifests, voice } = project;
    if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(config.project.id)) errors.push('project.id must be a stable lower-case application identifier.');
    if (!config.characters[config.project.protagonist]) errors.push('Unknown protagonist.');
    if (!config.chapters.length || new Set(config.chapters.map(chapter => chapter.id)).size !== config.chapters.length) errors.push('Chapters must have unique IDs and cannot be empty.');
    const commands = vm.runInNewContext(fs.readFileSync(path.join(root, 'js/core/command-handlers.js'), 'utf8') + '\nObject.keys(CommandHandlers)');
    for (const [language, scenes] of Object.entries(stories)) {
        const manifest = manifests[language];
        for (const id of new Set([...Object.keys(scenes), ...Object.keys(manifest)])) {
            if (!scenes[id] || !manifest[id]) errors.push(`${language}/${id}: manifest and registered scenes differ.`);
        }
        for (const scene of [config.project.startScene, ...config.chapters.map(chapter => chapter.scene)]) if (!scenes[scene]) errors.push(`${language}: unknown chapter/start scene ${scene}`);
        for (const [scene, rows] of Object.entries(scenes)) {
            if (!Array.isArray(rows) || !rows.length) { errors.push(`${language}/${scene}: expected nonempty command array.`); continue; }
            rows.forEach((command, index) => {
                const location = `${language}/${scene}:${index}`;
                if (!commands.includes(command.type) || command.type === 'unknown') errors.push(`${location}: unknown command ${command.type}`);
                for (const target of [command.target, command.targetTrue, command.targetFalse, command.targetNext, command.targetSuccess, command.targetFail, ...(command.options || []).map(option => option.target)].filter(Boolean)) {
                    if (!scenes[target]) errors.push(`${location}: unknown target ${target}`);
                }
                const group = { background: 'backgrounds', cg: 'cgs', sound: 'soundEffects', bgm: 'bgm' }[command.type];
                if (group && command.asset !== 'stop' && !config[group]?.[command.asset]) errors.push(`${location}: unknown ${group} key ${command.asset}`);
                if (command.speaker && command.speaker !== 'system' && !config.characters[command.speaker]) errors.push(`${location}: unknown speaker ${command.speaker}`);
                if (['showCharacter', 'hideCharacter'].includes(command.type) && !config.characters[command.id]) errors.push(`${location}: unknown character ${command.id}`);
                if (language !== 'zh' && commandStructure(command) !== commandStructure(stories.zh[scene]?.[index] || {})) errors.push(`${location}: translated command structure differs.`);
            });
            if (language !== 'zh' && rows.length !== stories.zh[scene]?.length) errors.push(`${language}/${scene}: translated command count differs.`);
        }
        if (Object.keys(scenes).sort().join('|') !== Object.keys(stories.zh).sort().join('|')) errors.push(`${language}: translated scene set differs.`);
    }
    function checkPaths(value) {
        if (typeof value === 'string' && value.startsWith('assets/') && !fs.existsSync(path.join(root, value))) errors.push(`Missing configured resource: ${value}`);
        else if (value && typeof value === 'object') Object.values(value).forEach(checkPaths);
    }
    checkPaths(config);
    checkPaths(voice);
    for (const [key, entry] of Object.entries(voice.entries || {})) {
        const match = /^(.*):(\d+)$/.exec(key);
        const command = match && stories.zh[match[1]]?.[Number(match[2])];
        if (!command || command.type !== 'dialogue' || command.speaker !== entry.speaker) errors.push(`Voice manifest has a stale location/speaker: ${key}`);
    }
    const settings = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    if (settings.license !== 'ISC' || !fs.existsSync(path.join(root, 'LICENSE'))) errors.push('Expected ISC license and LICENSE file.');
    return { errors, jsFiles: jsFiles.length, sceneCount: Object.values(stories).reduce((sum, scenes) => sum + Object.keys(scenes).length, 0) };
}
if (require.main === module) {
    const result = validate();
    result.errors.forEach(error => console.error(error));
    if (result.errors.length) process.exitCode = 1;
    else console.log(`Project checks passed: ${result.jsFiles} JavaScript files, ${result.sceneCount} language scenes.`);
}
module.exports = { validate, loadProject, commandStructure, walk };
