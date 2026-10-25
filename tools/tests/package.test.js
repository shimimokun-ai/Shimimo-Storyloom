const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const asar = require('@electron/asar');
const { verifyPackage } = require('../check-package.cjs');

async function fixture(run) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'galgame-package-check-'));
    const source = path.join(temp, 'source');
    const files = {
        'index.html': '<script src="js/config.js"></script>',
        'main.js': "require('./electron/chat-config'); require('./electron/steam-achievements');",
        'preload.js': '', 'steam-config.json': '{}', 'js/config.js': '',
        'js/data/achievements.js': '', 'electron/chat-config.js': '', 'electron/steam-achievements.js': ''
    };
    for (const [file, content] of Object.entries(files)) {
        const target = path.join(source, file);
        fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, content);
    }
    let revision = 0;
    const pack = async () => {
        const archive = path.join(temp, `fixture-${revision++}.asar`);
        await asar.createPackage(source, archive); return verifyPackage(archive);
    };
    try { await run(source, pack); }
    finally {
        const resolved = path.resolve(temp);
        const parent = path.resolve(os.tmpdir()) + path.sep;
        if (!resolved.startsWith(parent) || !path.basename(resolved).startsWith('galgame-package-check-')) throw new Error('Unsafe fixture cleanup path.');
        fs.rmSync(resolved, { recursive: true, force: true });
    }
}

test('packaged dependency check detects the omitted desktop service that prevents EXE startup', async () => {
    await fixture(async (source, pack) => {
        assert.deepEqual((await pack()).errors, []);
        fs.unlinkSync(path.join(source, 'electron/chat-config.js'));
        const report = await pack();
        assert.ok(report.errors.includes('Missing runtime file: electron/chat-config.js'));
        assert.ok(report.errors.some(error => error.includes('main.js -> ./electron/chat-config')));
    });
});
test('packaged media check detects binary files even with an unrecognized extension', async () => {
    await fixture(async (source, pack) => {
        fs.mkdirSync(path.join(source, 'assets'));
        fs.writeFileSync(path.join(source, 'assets/hidden.dat'), Buffer.from([0, 1, 2, 3]));
        assert.ok((await pack()).errors.includes('Non-text application file: assets/hidden.dat'));
    });
});
