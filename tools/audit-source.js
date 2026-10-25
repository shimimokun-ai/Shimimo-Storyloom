const fs = require('node:fs');
const path = require('node:path');
const { isUtf8 } = require('node:buffer');
const { execFileSync } = require('node:child_process');
const { walk } = require('./check-project');
const ROOT = path.resolve(__dirname, '..');
const media = /\.(png|jpe?g|gif|webp|svg|bmp|ico|mp3|wav|ogg|flac|m4a|mp4|webm|mov|ttf|otf|woff2?|psd|aep|zip|rar|7z|exe|dll)$/i;
function audit(root = ROOT) {
    const errors = [], files = walk(root);
    for (const file of files) {
        const name = path.relative(root, file).split(path.sep).join('/');
        if (media.test(name)) errors.push(`Media, binary or archive file is not allowed in this source-only repository: ${name}`);
        if (/^(?:\.env(?:\.|$)|steam_appid\.txt$)|(?:^|\/)(?:CharacterVoice|steam_store|steamworks_sdk_[^/]+|未调整图片|已调整图片|未处理)(?:\/|$)/i.test(name)) errors.push(`Private production file: ${name}`);
        const data = fs.readFileSync(file);
        if (!isUtf8(data) || data.includes(0)) errors.push(`Non-text file: ${name}`);
        const content = data.toString('utf8');
        if (/(?:sk-[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(content)) errors.push(`Possible credential: ${name}`);
    }
    if (fs.existsSync(path.join(root, '.git'))) {
        const history = execFileSync('git', ['rev-list', '--objects', '--all'], { cwd: root, encoding: 'utf8' });
        for (const line of history.split('\n')) if (media.test(line.slice(41))) errors.push(`Media found in Git history: ${line.slice(41)}`);
        if (fs.existsSync(path.join(root, '.git', 'objects', 'info', 'alternates'))) errors.push('Repository must not borrow objects from another checkout.');
    }
    return { errors, files: files.length, bytes: files.reduce((sum, file) => sum + fs.statSync(file).size, 0) };
}
if (require.main === module) {
    const result = audit();
    result.errors.forEach(error => console.error(error));
    if (result.errors.length) process.exitCode = 1;
    else console.log(`Source-only audit passed: ${result.files} text files, ${result.bytes} bytes; no artwork, audio, video, archives or binary files.`);
}
module.exports = { audit };
