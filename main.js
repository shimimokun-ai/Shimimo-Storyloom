const { app, BrowserWindow, ipcMain, session, shell, safeStorage } = require('electron');
const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');
const { createSteamAchievements } = require('./electron/steam-achievements');
const { createChatConfig } = require('./electron/chat-config');
const steamConfig = require('./steam-config.json');
const projectConfig = require('./js/config');
const smokeMode = process.argv.includes('--framework-smoke');
const allowedBilibiliProfiles = new Set(Object.values(require('./js/config').characters)
    .map(character => character.profile?.bilibili)
    .filter(url => typeof url === 'string' && /^https:\/\/space\.bilibili\.com\/[1-9]\d*$/.test(url)));
let achievements = null;

let chatConfig = null;
const CHAT_REQUEST_TIMEOUT_MS = 30_000;
const MAX_CHAT_REPLY_LENGTH = 12_000;
let mainWindow = null;
const chatRequests = new Map();
// Development tools start: this block is removed from the Demo build.
app.setName(projectConfig.project.name);
app.setPath('userData', smokeMode ? path.join(os.tmpdir(), `galgame-framework-smoke-${process.pid}`)
    : path.join(app.getPath('appData'), projectConfig.project.id + (app.isPackaged ? '' : '-development')));
ipcMain.handle('development:is-enabled', event => {
    if (!isTrustedRenderer(event)) throw new Error('Rejected untrusted development request.');
    return app.isPackaged === false;
});
// Development tools end.
// Avoid two processes racing to replace the same per-account achievement file.
const ownsInstance = app.requestSingleInstanceLock();
if (!ownsInstance) app.quit();
app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
});

function isTrustedRenderer(event) {
    if (!mainWindow || event.sender !== mainWindow.webContents
        || event.senderFrame !== mainWindow.webContents.mainFrame) return false;
    const senderUrl = event.senderFrame?.url || '';
    const appUrl = pathToFileURL(path.join(__dirname, 'index.html')).href;
    return senderUrl === appUrl || senderUrl.startsWith(`${appUrl}#`) || senderUrl.startsWith(`${appUrl}?`);
}

function configureSessionSecurity(targetSession) {
    targetSession.setPermissionCheckHandler(() => false);
    targetSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        useContentSize: true,
        autoHideMenuBar: true,
        show: !smokeMode,
        fullscreen: false, // Developers can opt into fullscreen from settings.
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            backgroundThrottling: !smokeMode,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    mainWindow.setMenuBarVisibility(false); // Hide menu bar
    mainWindow.setMenu(null); // Do not let the native menu change the game viewport.
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
    mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
    mainWindow.on('closed', () => {
        for (const controller of chatRequests.values()) controller.abort();
        chatRequests.clear();
        mainWindow = null;
    });
}

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Optional: the SDK overlay changes Chromium GPU flags; keep opt-in until validated.
if (steamConfig.enableOverlay === true) {
    try { require('steamworks.js').electronEnableSteamOverlay(); }
    catch (error) { console.warn('Steam overlay unavailable.', error.message); }
}

app.whenReady().then(() => {
    if (!ownsInstance) return;
    chatConfig = createChatConfig({ userData: app.getPath('userData'), safeStorage });
    achievements = createSteamAchievements({ userData: app.getPath('userData'),
        appId: app.isPackaged === false ? null : steamConfig.appId });
    setTimeout(() => achievements.sync(true), 2000).unref();
    const achievementRetry = setInterval(() => achievements.sync(), 60000);
    achievementRetry.unref();
    app.on('browser-window-focus', () => achievements.sync());
    app.on('before-quit', () => { clearInterval(achievementRetry); achievements.sync(true); });
    configureSessionSecurity(session.defaultSession);
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

ipcMain.handle('achievements:get', (event) => {
    if (!isTrustedRenderer(event)) throw new Error('Rejected untrusted achievement request.');
    achievements.sync();
    return achievements.snapshot();
});

ipcMain.handle('achievements:record', (event, payload) => {
    if (!isTrustedRenderer(event)) throw new Error('Rejected untrusted achievement request.');
    if (projectConfig.features.achievements === false) return { ...achievements.snapshot(), newlyUnlocked: [] };
    return achievements.record(payload);
});

ipcMain.on('quit-game', (event) => {
    if (!isTrustedRenderer(event)) {
        return;
    }
    app.quit();
});

// Fixed local destination only; never accept a renderer-provided URL or path.
ipcMain.handle('window:return-to-title', async (event) => {
    if (!isTrustedRenderer(event)) {
        throw new Error('Rejected request from an untrusted renderer.');
    }
    await mainWindow.loadFile(path.join(__dirname, 'index.html'));
});

ipcMain.handle('gallery:open-bilibili', async (event, url) => {
    if (!isTrustedRenderer(event)) {
        throw new Error('Rejected request from an untrusted renderer.');
    }
    if (typeof url !== 'string' || !allowedBilibiliProfiles.has(url)) {
        throw new Error('Bilibili profile is not allowed.');
    }
    await shell.openExternal(url, { activate: true });
    return true;
});

ipcMain.handle('window:get-fullscreen', (event) => {
    if (!isTrustedRenderer(event)) {
        throw new Error('Rejected request from an untrusted renderer.');
    }

    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    return targetWindow ? targetWindow.isFullScreen() : false;
});

ipcMain.handle('window:set-fullscreen', (event, isFullscreen) => {
    if (!isTrustedRenderer(event)) {
        throw new Error('Rejected request from an untrusted renderer.');
    }
    if (typeof isFullscreen !== 'boolean') {
        throw new TypeError('Invalid fullscreen state.');
    }

    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    if (!targetWindow) return false;

    targetWindow.setFullScreen(isFullscreen);
    return targetWindow.isFullScreen();
});

ipcMain.handle('chat:status', event => {
    if (!isTrustedRenderer(event)) throw new Error('Rejected untrusted chat request.');
    return { available: chatConfig.snapshot().hasApiKey };
});

ipcMain.handle('chat:config:get', event => {
    if (!isTrustedRenderer(event)) throw new Error('Rejected untrusted chat request.');
    return chatConfig.snapshot();
});

ipcMain.handle('chat:config:save', (event, payload) => {
    if (!isTrustedRenderer(event)) throw new Error('Rejected untrusted chat request.');
    const result = chatConfig.save(payload);
    for (const controller of chatRequests.values()) controller.abort();
    return result;
});

ipcMain.handle('chat:config:clear', event => {
    if (!isTrustedRenderer(event)) throw new Error('Rejected untrusted chat request.');
    const result = chatConfig.clear();
    for (const controller of chatRequests.values()) controller.abort();
    return result;
});

ipcMain.handle('chat:cancel', (event, requestId) => {
    if (!isTrustedRenderer(event)) throw new Error('Rejected untrusted chat request.');
    const controller = chatRequests.get(requestId);
    if (!controller) return false;
    controller.abort();
    return true;
});

ipcMain.handle('chat-completion', async (event, messages, requestId) => {
    if (!isTrustedRenderer(event)) {
        throw new Error('Rejected request from an untrusted renderer.');
    }

    if (!projectConfig.features.chat) throw new Error('Character chat is disabled in project configuration.');
    const { apiKey, baseUrl, model } = chatConfig.credentials();
    if (!apiKey) {
        throw new Error('CHAT_NOT_CONFIGURED');
    }

    if (!Array.isArray(messages) || messages.length > 21) {
        throw new TypeError('Invalid chat messages.');
    }
    if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(requestId)
        || chatRequests.has(requestId)) throw new TypeError('Invalid chat request ID.');
    if (chatRequests.size >= 5) throw new Error('CHAT_BUSY');

    const safeMessages = messages.map(({ role, content }) => {
        if (!['system', 'user', 'assistant'].includes(role) || typeof content !== 'string') {
            throw new TypeError('Invalid chat message.');
        }
        return { role, content: content.slice(0, 12000) };
    });

    const controller = new AbortController();
    const timeoutSignal = AbortSignal.timeout(CHAT_REQUEST_TIMEOUT_MS);
    chatRequests.set(requestId, controller);
    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: safeMessages,
                temperature: 1.0,
                stream: false
            }),
            signal: AbortSignal.any([controller.signal, timeoutSignal]),
            redirect: 'error'
        });
        if (response.status === 429) throw new Error('CHAT_RATE_LIMITED');
        if (response.status === 401 || response.status === 403) throw new Error('CHAT_AUTH_FAILED');
        if (!response.ok) throw new Error('CHAT_FAILED');
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        const reply = typeof content === 'string' ? content.trim() : '';
        if (!reply) throw new Error('CHAT_FAILED');
        return reply.slice(0, MAX_CHAT_REPLY_LENGTH);
    } catch (error) {
        if (timeoutSignal.aborted) throw new Error('CHAT_TIMEOUT');
        if (controller.signal.aborted) throw new Error('CHAT_CANCELLED');
        if (error.message?.startsWith('CHAT_')) throw error;
        throw new Error('CHAT_OFFLINE');
    } finally {
        chatRequests.delete(requestId);
    }
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
