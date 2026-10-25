const SaveManager = (() => {
    const KEY_PREFIX = `${GameConfig.project.id}_`;

    const normalizeKey = (key) => key.startsWith(KEY_PREFIX) ? key : `${KEY_PREFIX}${key}`;

    const cloneDefault = (value) => {
        if (value === null || typeof value !== 'object') return value;
        return JSON.parse(JSON.stringify(value));
    };

    const getStorage = (session) => session ? window.sessionStorage : window.localStorage;

    const decode = (rawValue, defaultValue) => {
        if (typeof defaultValue === 'boolean') return rawValue === 'true';

        if (typeof defaultValue === 'number') {
            if (rawValue.trim() === '') return defaultValue;
            const parsed = Number(rawValue);
            return Number.isFinite(parsed) ? parsed : defaultValue;
        }

        if (defaultValue !== null && typeof defaultValue === 'object') {
            try {
                const parsed = JSON.parse(rawValue);
                const hasExpectedShape = Array.isArray(defaultValue)
                    ? Array.isArray(parsed)
                    : parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
                return hasExpectedShape ? parsed : cloneDefault(defaultValue);
            } catch (error) {
                console.warn('Ignoring invalid saved data.', error);
                return cloneDefault(defaultValue);
            }
        }

        return rawValue;
    };

    const get = (key, defaultValue = null, { session = false } = {}) => {
        try {
            const rawValue = getStorage(session).getItem(normalizeKey(key));
            return rawValue === null ? cloneDefault(defaultValue) : decode(rawValue, defaultValue);
        } catch (error) {
            console.warn('Unable to read saved data.', error);
            return cloneDefault(defaultValue);
        }
    };

    const set = (key, value, { session = false } = {}) => {
        try {
            const encoded = value !== null && typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);
            getStorage(session).setItem(normalizeKey(key), encoded);
            return true;
        } catch (error) {
            console.warn('Unable to save data.', error);
            return false;
        }
    };

    const remove = (key, { session = false } = {}) => {
        try {
            getStorage(session).removeItem(normalizeKey(key));
        } catch (error) {
            console.warn('Unable to remove saved data.', error);
        }
    };

    const clearStorage = (storage) => {
        const keys = [];
        for (let index = 0; index < storage.length; index++) {
            const key = storage.key(index);
            if (key?.startsWith(KEY_PREFIX)) keys.push(key);
        }
        keys.forEach((key) => storage.removeItem(key));
    };

    const clearGameData = () => {
        try {
            clearStorage(window.localStorage);
            clearStorage(window.sessionStorage);
            return true;
        } catch (error) {
            console.warn('Unable to clear saved data.', error);
            return false;
        }
    };

    return Object.freeze({ get, set, remove, clearGameData });
})();
