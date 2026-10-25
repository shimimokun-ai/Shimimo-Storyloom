const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_CHAT_CONFIG = Object.freeze({ baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' });
const controlCharacters = /[\u0000-\u001f\u007f]/;

function normalizeBaseUrl(value) {
    if (typeof value !== 'string' || value.length > 2048 || controlCharacters.test(value)) {
        throw new Error('CHAT_CONFIG_INVALID_URL');
    }
    try {
        const url = new URL(value.trim());
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
            throw new Error();
        }
        url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
        return url.href.replace(/\/+$/, '');
    } catch {
        throw new Error('CHAT_CONFIG_INVALID_URL');
    }
}

function validateModel(value) {
    if (typeof value !== 'string' || !value.trim() || value.length > 200 || controlCharacters.test(value)) {
        throw new Error('CHAT_CONFIG_INVALID_MODEL');
    }
    return value.trim();
}

function validateKey(value) {
    if (typeof value !== 'string' || value.length > 4096 || controlCharacters.test(value)) {
        throw new Error('CHAT_CONFIG_INVALID_KEY');
    }
    return value.trim();
}

function createChatConfig({ userData, safeStorage, env = process.env, io = fs }) {
    const file = path.join(userData, 'llm-chat-config.json');
    let configured = false;
    let config = { ...DEFAULT_CHAT_CONFIG, apiKey: '', persistent: false };
    let loadError = false;
    if (io.existsSync(file)) {
        configured = true; // A saved or broken player config must never fall back to a developer key.
        try {
            const stored = JSON.parse(io.readFileSync(file, 'utf8'));
            if (stored.version !== 1) throw new Error();
            config.baseUrl = normalizeBaseUrl(stored.baseUrl);
            config.model = validateModel(stored.model);
            if (stored.encryptedKey) {
                if (!safeStorage?.isEncryptionAvailable()) throw new Error();
                config.apiKey = validateKey(safeStorage.decryptString(Buffer.from(stored.encryptedKey, 'base64')));
            }
            config.persistent = true;
        } catch {
            config.apiKey = '';
            loadError = true;
        }
    }

    function credentials() {
        if (configured) return { ...config };
        return { ...DEFAULT_CHAT_CONFIG, apiKey: (env.DEEPSEEK_API_KEY || '').trim(), persistent: false };
    }

    function snapshot() {
        const current = credentials();
        return { baseUrl: current.baseUrl, model: current.model, hasApiKey: Boolean(current.apiKey),
            persistent: current.persistent, usesEnvironmentKey: !configured && Boolean(current.apiKey), loadError };
    }

    function write(stored) {
        const temporary = `${file}.tmp`;
        try {
            io.mkdirSync(userData, { recursive: true });
            io.writeFileSync(temporary, JSON.stringify(stored), { encoding: 'utf8', mode: 0o600 });
            io.renameSync(temporary, file);
        } catch {
            try { io.unlinkSync(temporary); } catch { /* No temporary file remains to remove. */ }
            throw new Error('CHAT_CONFIG_SAVE_FAILED');
        }
    }

    function save(payload) {
        if (!payload || typeof payload !== 'object') throw new Error('CHAT_CONFIG_INVALID_KEY');
        const next = { baseUrl: normalizeBaseUrl(payload.baseUrl), model: validateModel(payload.model),
            apiKey: validateKey(payload.apiKey), persistent: false };
        const current = credentials();
        if (!next.apiKey) {
            if (!current.apiKey || new URL(next.baseUrl).origin !== new URL(current.baseUrl).origin) {
                throw new Error('CHAT_CONFIG_KEY_REQUIRED');
            }
            next.apiKey = current.apiKey;
        }
        if (safeStorage?.isEncryptionAvailable()) {
            let encryptedKey;
            try { encryptedKey = safeStorage.encryptString(next.apiKey).toString('base64'); }
            catch { throw new Error('CHAT_CONFIG_SAVE_FAILED'); }
            write({ version: 1, baseUrl: next.baseUrl, model: next.model, encryptedKey });
            next.persistent = true;
        }
        // If OS encryption is unavailable, keep this session's key only in main-process memory.
        config = next;
        configured = true;
        loadError = false;
        return snapshot();
    }

    function clear() {
        write({ version: 1, ...DEFAULT_CHAT_CONFIG, encryptedKey: '' });
        config = { ...DEFAULT_CHAT_CONFIG, apiKey: '', persistent: true };
        configured = true;
        loadError = false;
        return snapshot();
    }

    return { snapshot, credentials, save, clear };
}

module.exports = { createChatConfig, DEFAULT_CHAT_CONFIG, normalizeBaseUrl };
