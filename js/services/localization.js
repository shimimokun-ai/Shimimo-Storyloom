const LocalizationMethods = {
    characterName(character) {
        const data = typeof character === 'string' ? GameConfig.characters[character] : character;
        return data?.names?.[RuntimeState.language] || data?.name || this.t('unknown');
    },
    dialogueSpeakerName(speakerId) {
        if (speakerId === GameConfig.project.protagonist) return this.characterName(speakerId);
        return this.characterName(speakerId);
    },
    t(key, ...args) {
        const lang = GameConfig.languages[RuntimeState.language];
        if (!lang || !lang.ui[key]) {
            // Fallback to zh
            const zh = GameConfig.languages['zh'];
            let text = zh && zh.ui[key] ? zh.ui[key] : key;
            // Simple %s replacement
            args.forEach((arg, i) => { text = text.replace('%s', arg); });
            return text;
        }
        let text = lang.ui[key];
        args.forEach((arg, i) => { text = text.replace('%s', arg); });
        return text;
    },

    updateUIText() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.t(key);
            if (text !== key) el.innerText = text;
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const text = this.t(key);
            if (text !== key) el.placeholder = text;
        });
    },

    applyLanguage(langCode) {
        const langData = GameConfig.languages[langCode];
        if (!langData) return;

        // Update main menu title image
        const titleEl = document.querySelector('.title');
        if (titleEl) {
            titleEl.textContent = langData.ui.gameTitle || GameConfig.project.name;
            titleEl.style.backgroundImage = langData.titleImage ? `url('${langData.titleImage}')` : 'none';
        }

        // Update language select dropdown to reflect current state
        if (this.languageSelectText) {
            const langData = GameConfig.languages[langCode];
            const optionMap = { 'zh': '中文', 'ja': '日本語', 'en': 'English' };
            this.languageSelectText.innerText = langData ? (langData.languageName || optionMap[langCode]) : optionMap[langCode];
        }
        if (this.languageSelect) {
            this.languageSelect.querySelectorAll('.custom-select-option').forEach(opt => {
                opt.classList.toggle('selected', opt.getAttribute('data-value') === langCode);
            });
        }

        // Button ID -> button key mapping
        const buttonMap = [
            { id: 'start-btn', key: 'start' },
            { id: 'load-btn', key: 'load' },
            { id: 'cg-btn', key: 'cg' },
            { id: 'characters-btn', key: 'character' },
            { id: 'message-btn', key: 'message' },
            { id: 'setting-btn', key: 'setting' },
            { id: 'exit-game-btn', key: 'exit' }
        ];

        buttonMap.forEach(({ id, key }) => {
            const btn = document.getElementById(id);
            if (btn && langData.buttons[key]) {
                btn.style.backgroundImage = `url('${langData.buttons[key]}')`;
            }
        });

        // Update HTML lang attribute
        document.documentElement.lang = langCode === 'zh' ? 'zh-CN' : langCode;
        document.title = langData.ui.gameTitle || GameConfig.project.name;

        // Update all UI text
        this.updateUIText();
        this.updateChatApiSettingsText?.();
        this.updateChatUnlockState?.();
        if (this.nameBox && GameConfig.characters[this.currentSpeaker]) {
            this.nameBox.innerText = this.dialogueSpeakerName(this.currentSpeaker);
        }
        AchievementManager.render();
        if (this.messageChatsByLanguage && this.currentChatCharId) this.selectContact(this.currentChatCharId);
    }
};
