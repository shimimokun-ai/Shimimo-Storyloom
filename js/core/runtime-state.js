const RuntimeState = (() => {
    const defaults = Object.freeze({
        language: 'zh',
        bgmVolume: 0.15,
        seVolume: 0.7,
        voiceVolume: 0.7,
        showPlayerSprite: true
    });

    const savedLanguage = SaveManager.get('language', defaults.language);
    let language = ['zh', 'ja', 'en'].includes(savedLanguage) ? savedLanguage : defaults.language;
    let bgmVolume = clampVolume(SaveManager.get('bgm_volume', defaults.bgmVolume), defaults.bgmVolume);
    let seVolume = clampVolume(SaveManager.get('se_volume', defaults.seVolume), defaults.seVolume);
    let voiceVolume = clampVolume(SaveManager.get('voice_volume', defaults.voiceVolume), defaults.voiceVolume);
    const savedPlayerSprite = SaveManager.get('show_player_sprite');
    let showPlayerSprite = savedPlayerSprite !== false && savedPlayerSprite !== 'false';
    let voiceCharacterEnabled = normalizeVoiceCharacterSettings(
        SaveManager.get('voice_character_enabled', {})
    );
    let voiceCharacterVolumes = normalizeVoiceCharacterVolumes(
        SaveManager.get('voice_character_volumes', {})
    );

    function normalizeVoiceCharacterVolumes(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
        return Object.fromEntries(Object.entries(value)
            .filter(([, volume]) => typeof volume === 'number' && Number.isFinite(volume))
            .map(([id, volume]) => [id, clampVolume(volume, 1)]));
    }

    function getVoiceCharacterVolume(characterId) {
        return Object.prototype.hasOwnProperty.call(voiceCharacterVolumes, characterId)
            ? voiceCharacterVolumes[characterId] : 1;
    }

    function setVoiceCharacterVolume(characterId, value) {
        if (!characterId) return 1;
        const volume = clampVolume(value, 1);
        voiceCharacterVolumes = { ...voiceCharacterVolumes, [characterId]: volume };
        SaveManager.set('voice_character_volumes', voiceCharacterVolumes);
        return volume;
    }

    function getEffectiveVoiceVolume(characterId) {
        return isVoiceEnabled(characterId) ? voiceVolume * getVoiceCharacterVolume(characterId) : 0;
    }

    function clampVolume(value, fallback) {
        const numericValue = Number(value);
        return Number.isFinite(numericValue)
            ? Math.max(0, Math.min(1, numericValue))
            : fallback;
    }

    function normalizeVoiceCharacterSettings(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
        return Object.fromEntries(
            Object.entries(value).filter(([, enabled]) => typeof enabled === 'boolean')
        );
    }

    function setLanguage(nextLanguage) {
        if (!['zh', 'ja', 'en'].includes(nextLanguage)) return false;
        language = nextLanguage;
        SaveManager.set('language', language);
        return true;
    }

    function setBgmVolume(value) {
        bgmVolume = clampVolume(value, defaults.bgmVolume);
        SaveManager.set('bgm_volume', bgmVolume);
        return bgmVolume;
    }

    function setSeVolume(value) {
        seVolume = clampVolume(value, defaults.seVolume);
        SaveManager.set('se_volume', seVolume);
        return seVolume;
    }

    function setVoiceVolume(value) {
        voiceVolume = clampVolume(value, defaults.voiceVolume);
        SaveManager.set('voice_volume', voiceVolume);
        return voiceVolume;
    }

    function setShowPlayerSprite(value) {
        showPlayerSprite = Boolean(value);
        SaveManager.set('show_player_sprite', showPlayerSprite);
        return showPlayerSprite;
    }

    function isVoiceEnabled(characterId) {
        return voiceCharacterEnabled[characterId] !== false;
    }

    function setVoiceEnabled(characterId, enabled) {
        if (!characterId) return false;
        voiceCharacterEnabled = {
            ...voiceCharacterEnabled,
            [characterId]: !!enabled
        };
        SaveManager.set('voice_character_enabled', voiceCharacterEnabled);
        return voiceCharacterEnabled[characterId];
    }

    function getUnlocked(collection) {
        return SaveManager.get(`unlocked_${collection}`, []);
    }

    function setUnlocked(collection, values) {
        const uniqueValues = [...new Set(Array.isArray(values) ? values : [])];
        SaveManager.set(`unlocked_${collection}`, uniqueValues);
        return uniqueValues;
    }

    function unlock(collection, value) {
        const values = getUnlocked(collection);
        if (!values.includes(value)) values.push(value);
        return setUnlocked(collection, values);
    }

    function getFlag(key, defaultValue = null) {
        return SaveManager.get(`flag_${key}`, { value: defaultValue }).value;
    }

    function setFlag(key, value) {
        return SaveManager.set(`flag_${key}`, { value });
    }

    function resetMemory() {
        language = defaults.language;
        bgmVolume = defaults.bgmVolume;
        seVolume = defaults.seVolume;
        voiceVolume = defaults.voiceVolume;
        showPlayerSprite = defaults.showPlayerSprite;
        voiceCharacterEnabled = {};
        voiceCharacterVolumes = {};
    }

    return Object.freeze({
        get language() { return language; },
        get bgmVolume() { return bgmVolume; },
        get seVolume() { return seVolume; },
        get voiceVolume() { return voiceVolume; },
        get showPlayerSprite() { return showPlayerSprite; },
        setLanguage,
        setBgmVolume,
        setSeVolume,
        setVoiceVolume,
        setShowPlayerSprite,
        getVoiceCharacterVolume,
        setVoiceCharacterVolume,
        getEffectiveVoiceVolume,
        isVoiceEnabled,
        setVoiceEnabled,
        getUnlocked,
        setUnlocked,
        unlock,
        getFlag,
        setFlag,
        resetMemory
    });
})();
