// The same catalog is shared by the browser and optional Electron/Steam adapter.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('../config'));
    else root.AchievementCatalog = factory(GameConfig);
})(globalThis, config => {
    const rows = [
        ['story_complete', '完成一个故事', '读完示例剧情。', '物語の終わり', 'サンプルを読み終える。', 'A Story Complete', 'Finish the sample story.'],
        ['rhythm_win', '跟上节拍', '完成节奏小游戏。', 'リズムに乗って', 'リズムゲームをクリアする。', 'Find Your Rhythm', 'Clear the rhythm minigame.'],
        ['fighting_win', '第一场胜利', '赢得格斗小游戏。', '初勝利', '格闘ゲームで勝利する。', 'First Victory', 'Win the fighting minigame.'],
        ['dodgeball_win', '顺利抵达', '完成雪地小游戏。', '無事に到着', '雪上ゲームをクリアする。', 'Safe Arrival', 'Finish the snow minigame.'],
        ['ema_complete', '写下心愿', '完成书写小游戏。', '願いを書く', '書き込みを完了する。', 'Make a Wish', 'Finish the writing minigame.']
    ];
    const definitions = (config.achievements?.definitions || rows.map(([id, zh, zhd, ja, jad, en, end]) => ({
        id, steamId: `ACH_${id.toUpperCase()}`, icon: null, lockedIcon: null,
        zh: { name: zh, description: zhd }, ja: { name: ja, description: jad }, en: { name: en, description: end }
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
