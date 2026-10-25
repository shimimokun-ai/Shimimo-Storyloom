// Exercise the real desktop entry point and sandboxed renderer with an isolated profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
process.argv.push('--framework-smoke');
app.disableHardwareAcceleration();
const errors = [], failedRequests = [];
app.on('web-contents-created', (_event, contents) => {
    contents.on('console-message', event => {
        if (event.level === 'error') errors.push(event.message);
    });
    contents.on('render-process-gone', (_event, details) => errors.push(`Renderer exited: ${details.reason}`));
    contents.session.webRequest.onErrorOccurred(details => failedRequests.push(`${details.url}: ${details.error}`));
});
require('../main');
const timeout = setTimeout(() => { console.error('Desktop smoke test timed out.'); app.exit(1); }, 60000);
app.whenReady().then(async () => {
    try {
        const window = BrowserWindow.getAllWindows()[0];
        const wc = window.webContents;
        await new Promise((resolve, reject) => { wc.once('did-finish-load', resolve); wc.once('did-fail-load', (_event, code, description) => reject(new Error(`${code}: ${description}`))); });
        const result = await wc.executeJavaScript('(' + require('./lib/smoke-renderer.cjs').toString() + ')()');
        if (errors.length || failedRequests.length) throw new Error(JSON.stringify({ errors, failedRequests }, null, 2));
        if (process.argv.includes('--screenshots')) {
            const output = path.join(root, 'output'); fs.mkdirSync(output, { recursive: true });
            await wc.executeJavaScript(`game.sysModal.classList.remove('visible'); game.sysModal.inert = true; game.mainMenu.style.display = 'block'; game.uiLayer.inert = false; game.dialogueBox.classList.add('hidden'); game.setGameState(GameState.MENU);`);
            const picture = await wc.capturePage(); fs.writeFileSync(path.join(output, 'menu.png'), picture.toPNG());
        }
        console.log('Desktop smoke test passed:', JSON.stringify(result));
        clearTimeout(timeout);
        app.exit(0);
    } catch (error) {
        console.error('Desktop smoke test failed:', error.stack);
        if (errors.length || failedRequests.length) console.error(JSON.stringify({ errors, failedRequests }, null, 2));
        clearTimeout(timeout); app.exit(1);
    }
});
