// electron-builder rewrites the Windows executable to embed ASAR integrity data.
// A freshly renamed executable can briefly be locked by Windows file scanning.
const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

function withExecutableRetry(write, outputRoot, platform = process.platform, sleep = delay) {
    const prefix = path.resolve(outputRoot) + path.sep;
    return async function (file, ...args) {
        const generatedExe = platform === 'win32' && typeof file === 'string'
            && path.resolve(file).startsWith(prefix) && /\.exe$/i.test(file);
        for (let attempt = 0; ; attempt++) {
            try { return await write.call(fs, file, ...args); }
            catch (error) {
                if (!generatedExe || !['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES'].includes(error.code) || attempt >= 8) throw error;
                await sleep(250 * (attempt + 1));
            }
        }
    };
}
async function main() {
    const root = path.resolve(__dirname, '..');
    const original = fs.writeFile;
    fs.writeFile = withExecutableRetry(original, path.join(root, 'dist'));
    try {
        const { build, Platform, Arch } = require('electron-builder');
        await build({ projectDir: root, targets: Platform.WINDOWS.createTarget(process.argv.includes('--dist') ? 'zip' : 'dir', Arch.x64), publish: 'never' });
        const report = require('./check-package.cjs').verifyPackage(path.join(root, 'dist/win-unpacked/resources/app.asar'));
        if (report.errors.length) throw new Error(report.errors.join('\n'));
        console.log(`Packaged source check passed: ${report.files} text files; no game media.`);
    } finally { fs.writeFile = original; }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { withExecutableRetry };
