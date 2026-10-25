// Test the produced executable using a loopback-only inspector and a temporary profile.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

async function main() {
    const root = path.resolve(__dirname, '..');
    const settings = require('../package.json');
    const executable = path.join(root, 'dist/win-unpacked', `${settings.build.executableName}.exe`);
    if (!fs.existsSync(executable)) throw new Error('Run npm run package before testing the executable.');
    const port = await new Promise((resolve, reject) => {
        const server = net.createServer(); server.on('error', reject);
        server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
    });
    const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
    const log = path.join(os.tmpdir(), `galgame-package-${process.pid}.log`);
    const child = spawn(executable, ['--framework-smoke', `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1', '--enable-logging=file', `--log-file=${log}`],
        { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let socket, exited = false, output = '', nextId = 0;
    const pending = new Map(), pageErrors = [], requestErrors = [];
    child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
    child.on('exit', () => { exited = true; });
    const deadline = setTimeout(() => { child.kill(); for (const request of pending.values()) request.reject(new Error('Packaged smoke test timed out.')); }, 60000);
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
    });
    try {
        let target;
        for (let attempt = 0; attempt < 100; attempt++) {
            if (exited) throw new Error(`Packaged executable exited during startup: ${output}`);
            try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(item => item.type === 'page'); } catch {}
            if (target) break;
            await delay(100);
        }
        if (!target) throw new Error(`Packaged inspector unavailable: ${output}`);
        socket = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
        socket.addEventListener('message', event => {
            const message = JSON.parse(event.data);
            if (message.id) {
                const request = pending.get(message.id); pending.delete(message.id);
                if (message.error) request?.reject(new Error(JSON.stringify(message.error))); else request?.resolve(message.result);
            } else if (message.method === 'Runtime.exceptionThrown') pageErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
            else if (message.method === 'Network.loadingFailed') requestErrors.push(message.params.errorText);
        });
        socket.addEventListener('close', () => { for (const request of pending.values()) request.reject(new Error('Packaged inspector closed.')); pending.clear(); });
        await send('Runtime.enable'); await send('Network.enable');
        let initialized = false;
        for (let attempt = 0; attempt < 100; attempt++) {
            const result = await send('Runtime.evaluate', { expression: 'location.href.includes("index.html") && !!window.game', returnByValue: true });
            if (result.result?.value) { initialized = true; break; }
            await delay(100);
        }
        if (!initialized) throw new Error(`Packaged engine did not initialize: ${JSON.stringify(pageErrors)}`);
        const result = await send('Runtime.evaluate', { expression: '(' + require('./lib/smoke-renderer.cjs').toString() + ')()', awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
        if (pageErrors.length || requestErrors.length) throw new Error(JSON.stringify({ pageErrors, requestErrors }));
        console.log('Packaged smoke test passed:', JSON.stringify(result.result.value));
        socket.send(JSON.stringify({ id: ++nextId, method: 'Browser.close' }));
        for (let attempt = 0; attempt < 20 && !exited; attempt++) await delay(100);
    } catch (error) {
        if (fs.existsSync(log)) console.error(fs.readFileSync(log, 'utf8').slice(-4000));
        throw error;
    } finally {
        clearTimeout(deadline); socket?.close(); if (!exited) child.kill();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
