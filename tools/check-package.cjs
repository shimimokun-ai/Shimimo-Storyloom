const fs = require('node:fs');
const path = require('node:path');
const { isUtf8 } = require('node:buffer');

function verifyPackage(archive) {
    const asar = require('@electron/asar');
    const files = new Map();
    const errors = [];
    for (const entry of asar.listPackage(archive)) {
        const nativeName = path.normalize(entry.replace(/^[/\\]/, ''));
        if (asar.statFile(archive, nativeName).files) continue;
        const name = nativeName.split(path.sep).join('/');
        const data = asar.extractFile(archive, nativeName);
        files.set(name, data);
        if (!isUtf8(data) || data.includes(0)) errors.push(`Non-text application file: ${name}`);
        if (/\.(png|jpe?g|gif|webp|svg|ico|psd|aep|mp3|wav|ogg|flac|mp4|webm|ttf|otf|woff2?|zip|rar|7z)$/i.test(name)) errors.push(`Unexpected media: ${name}`);
        if (/^(tools|docs|\.git|node_modules)\//.test(name)) errors.push(`Unexpected development file: ${name}`);
        if (/data:(?:image|audio|video|font)\/[^;]+;base64,[A-Za-z0-9+/=]{64,}/i.test(data.toString())) errors.push(`Embedded media: ${name}`);
    }
    for (const name of ['index.html', 'main.js', 'preload.js', 'steam-config.json', 'electron/chat-config.js', 'electron/steam-achievements.js', 'js/config.js', 'js/data/achievements.js']) {
        if (!files.has(name)) errors.push(`Missing runtime file: ${name}`);
    }
    const html = files.get('index.html')?.toString() || '';
    for (const [, name] of html.matchAll(/(?:src|href)="((?:js|css)\/[^"?#]+)"/g)) {
        if (!files.has(name)) errors.push(`Missing page dependency: ${name}`);
    }
    for (const [name, data] of files) {
        if (!/\.(js|cjs)$/.test(name)) continue;
        for (const [, reference] of data.toString().matchAll(/require\(['"](\.[^'"]*)['"]\)/g)) {
            const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(name), reference));
            if (![resolved, `${resolved}.js`, `${resolved}.json`, `${resolved}/index.js`].some(file => files.has(file))) errors.push(`Missing desktop dependency: ${name} -> ${reference}`);
        }
        for (const [, story] of data.toString().matchAll(/["'](js\/story\/[a-z-]+\/[\w-]+\.js)["']/g)) {
            if (!files.has(story)) errors.push(`Missing story chapter: ${story}`);
        }
    }
    return { files: files.size, assets: [...files.keys()].filter(name => name.startsWith('assets/')), errors };
}
if (require.main === module) {
    const archive = process.argv[2] || path.resolve(__dirname, '../dist/win-unpacked/resources/app.asar');
    if (!fs.existsSync(archive)) throw new Error('Run npm run package before checking the application archive.');
    const result = verifyPackage(archive);
    console.log(JSON.stringify(result, null, 2));
    if (result.errors.length) process.exitCode = 1;
}
module.exports = { verifyPackage };
