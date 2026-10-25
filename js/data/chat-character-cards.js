// Chat personas belong to the project configuration, not the engine.
const ChatCharacterCards = Object.freeze({
    getPrompt(id, language, name) {
        const card = GameConfig.chat?.cards?.[id]?.[language] || GameConfig.chat?.cards?.[id]?.zh;
        return { name: name || id, greeting: card?.greeting || '', prompt: card?.prompt || '', system: card?.prompt || '' };
    }
});
