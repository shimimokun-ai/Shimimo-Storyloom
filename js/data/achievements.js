// The same catalog is shared by the browser and optional Electron/Steam adapter.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('../config'));
    else root.AchievementCatalog = factory(GameConfig);
})(globalThis, config => {
    // Stable sample event IDs; the default display is only 1, 2, 3.
    const placeholders = ['story_complete', 'rhythm_win', 'fighting_win'];
    const definitions = (config.achievements?.definitions || placeholders.map((id, index) => ({
        id, steamId: `ACH_${id.toUpperCase()}`, icon: null, lockedIcon: null,
        zh: { name: String(index + 1), description: '' },
        ja: { name: String(index + 1), description: '' },
        en: { name: String(index + 1), description: '' }
    }))).map(Object.freeze);
    const ids = new Set(definitions.map(item => item.id));
    const encounterCharacters = Object.freeze(Object.keys(config.characters));
    const storyMilestones = Object.freeze(config.achievements?.milestones || []);
    function normalize(raw) {
        const unlocked = {};
        for (const id of ids) if (typeof raw?.unlocked?.[id] === 'string' && Number.isFinite(Date.parse(raw.unlocked[id]))) unlocked[id] = raw.unlocked[id];
        return { version: 1, unlocked, met: [...new Set((Array.isArray(raw?.met) ? raw.met : []).filter(id => encounterCharacters.includes(id)))] };
    }
    function validEvent(event) {
        return !!event && typeof event === 'object' && !Array.isArray(event) && typeof event.id === 'string'
            && ((event.type === 'unlock' && ids.has(event.id)) || (event.type === 'meet' && encounterCharacters.includes(event.id)));
    }
    function apply(state, event, now = new Date().toISOString()) {
        if (!validEvent(event)) return [];
        if (event.type === 'meet') { if (!state.met.includes(event.id)) state.met.push(event.id); return []; }
        if (state.unlocked[event.id]) return [];
        state.unlocked[event.id] = now;
        return [event.id];
    }
    function storyAchievement(scene, command) { return command?.type === 'jump' ? storyMilestones.find(item => item.scene === scene && item.target === command.target)?.id : undefined; }
    return Object.freeze({ definitions: Object.freeze(definitions), normalize, apply, validEvent, storyAchievement, storyMilestones,
        encounterCharacters, mainCharacters: encounterCharacters, characterAchievements: Object.freeze({}) });
});
