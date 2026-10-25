const MessageInterfaceMethods = {
    isChatUnlocked() {
        return GameConfig.features.chat && (!GameConfig.chat.unlockAfterEnding || SaveManager.get('cleared', false) === true);
    },

    updateChatUnlockState() {
        const unlocked = this.isChatUnlocked();
        if (this.messageBtn) {
            this.messageBtn.classList.toggle('chat-locked', !unlocked);
            this.messageBtn.dataset.lockLabel = this.t('chatLockedBadge');
            this.messageBtn.title = unlocked ? '' : this.t('chatUnlockRequirement');
            this.messageBtn.setAttribute('aria-label', unlocked ? this.t('menuMessage')
                : `${this.t('menuMessage')} (${this.t('chatUnlockRequirement')})`);
        }
        return unlocked;
    },

    openMessageInterface() {
        if (!this.updateChatUnlockState()) {
            this.showSystemModal(this.t('chatUnlockRequirement'));
            return;
        }
        this.enterOverlay('message');
        this.messageModal.classList.add('visible');
        this.renderContacts();
        if (this.currentChatCharId) this.selectContact(this.currentChatCharId);
        this.refreshChatAvailability();
    },

    closeMessageInterface() {
        this.messageModal.classList.remove('visible');
        this.leaveOverlay('message');
    },

    getContactList() {
        const contacts = GameConfig.chat?.contacts || [];
        return contacts.filter(id => GameConfig.characters[id]);
    },

    initializeChatData() {
        this.currentChatCharId = null;
        this.chatLanguage = RuntimeState.language;
        this.chatRequests = new Map();
        this.chatDrafts = new Map();
        this.chatRequestCounter = 0;
        this.chatAvailable = null;
        this.chatAvailabilityKey = 'chatChecking';
        this.messageChatsByLanguage = { zh: {}, ja: {}, en: {} };
        const saved = SaveManager.get('message_history', {});
        const copyHistory = (history, charId, language) => {
            if (!Array.isArray(history) || !GameConfig.characters[charId]) return;
            const entries = history.filter(msg => msg && ['user', 'character', 'system'].includes(msg.sender)
                && (typeof msg.text === 'string' || typeof msg.errorKey === 'string')).map(msg => ({ ...msg }));
            const first = entries[0];
            if (first?.sender === 'character' && first.text === this.getCharPrompt(charId, language).greeting) {
                first.kind = 'greeting';
            }
            this.messageChatsByLanguage[language][charId] = entries;
        };
        if (saved.version === 2 && saved.histories) {
            for (const language of ['zh', 'ja', 'en']) {
                for (const [charId, history] of Object.entries(saved.histories[language] || {})) {
                    copyHistory(history, charId, language);
                }
            }
        } else {
            // Preserve legacy conversations in the language of their original greeting.
            for (const [charId, history] of Object.entries(saved)) {
                if (!Array.isArray(history)) continue;
                const language = ['zh', 'ja', 'en'].find(lang =>
                    history[0]?.text === this.getCharPrompt(charId, lang).greeting) || RuntimeState.language;
                copyHistory(history, charId, language);
            }
        }
        this.saveChats();
    },

    chatConversationKey(charId, language = RuntimeState.language) {
        return `${language}:${charId}`;
    },

    getChatHistory(charId, language = RuntimeState.language) {
        const histories = this.messageChatsByLanguage[language];
        if (!histories[charId]) histories[charId] = [{ sender: 'character', kind: 'greeting',
            text: this.getCharPrompt(charId, language).greeting, timestamp: Date.now() }];
        return histories[charId];
    },

    async refreshChatAvailability() {
        if (!this.updateChatUnlockState()) {
            this.chatAvailable = false;
            this.chatAvailabilityKey = 'chatUnlockRequirement';
        } else if (!window.electronAPI?.requestChatCompletion) {
            this.chatAvailable = false;
            this.chatAvailabilityKey = 'chatUnavailable';
        } else {
            try {
                const status = window.electronAPI.getChatStatus ? await window.electronAPI.getChatStatus() : { available: true };
                this.chatAvailable = status.available === true;
                this.chatAvailabilityKey = this.chatAvailable ? 'online' : 'chatNotConfigured';
            } catch {
                this.chatAvailable = false;
                this.chatAvailabilityKey = 'chatFailed';
            }
        }
        this.updateChatControls();
    },

    updateChatControls() {
        const unlocked = this.isChatUnlocked();
        const pending = this.chatRequests.has(this.chatConversationKey(this.currentChatCharId));
        const enabled = Boolean(unlocked && this.currentChatCharId && this.chatAvailable && !pending);
        this.chatInput.disabled = !enabled;
        this.chatSendBtn.disabled = !enabled;
        if (this.chatClearBtn) this.chatClearBtn.disabled = !this.currentChatCharId;
        this.setChatStatus(this.t(!unlocked ? 'chatUnlockRequirement' : pending ? 'typing' : this.chatAvailabilityKey || 'online'));
        this.chatHeaderStatus.dataset.state = !unlocked ? 'locked' : pending ? 'typing' : this.chatAvailable ? 'online' : 'unavailable';
    },

    getCharPrompt(charId, language = RuntimeState.language) {
        const character = GameConfig.characters[charId];
        return ChatCharacterCards.getPrompt(charId, language, character?.names?.[language] || character?.name);
    },
    renderContacts() {
        this.messageContactList.innerHTML = '';
        const contacts = this.getContactList();

        contacts.forEach(id => {
            const charConfig = GameConfig.characters[id];

            const el = document.createElement('button');
            el.type = 'button';
            el.dataset.contactId = id;
            el.className = `contact-item ${this.currentChatCharId === id ? 'active' : ''}`;
            el.onclick = () => this.selectContact(id);
            el.setAttribute('aria-pressed', String(this.currentChatCharId === id));

            // Use icon if available, else fallback to sprite
            let avatarUrl = charConfig.icon || "";
            if (!avatarUrl && charConfig.sprites) {
                avatarUrl = charConfig.sprites.default || charConfig.sprites.normal || "";
            }

            const cp = charConfig.profile;
            const cLang = RuntimeState.language;
            const cpd = (cLang !== 'zh' && cp && cp[cLang]) ? cp[cLang] : cp;
            el.innerHTML = `
                <div class="contact-avatar" style="background-image: url('${avatarUrl}')"></div>
                <div class="contact-info">
                    <div class="contact-name">${this.characterName(charConfig)}</div>
                    <div class="contact-desc">${cpd?.role || ''}</div>
                </div>
            `;
            this.messageContactList.appendChild(el);
        });
    },

    selectContact(charId) {
        if (this.currentChatCharId) {
            this.chatDrafts.set(this.chatConversationKey(this.currentChatCharId, this.chatLanguage), this.chatInput.value);
        }
        this.currentChatCharId = charId;
        this.chatLanguage = RuntimeState.language;
        this.renderContacts(); // Update active state

        const charConfig = GameConfig.characters[charId];
        this.chatHeaderName.innerText = this.characterName(charConfig);
        this.chatInput.value = this.chatDrafts.get(this.chatConversationKey(charId)) || '';
        this.getChatHistory(charId);
        this.saveChats();
        this.updateChatControls();
        if (!this.chatInput.disabled) this.chatInput.focus();
        else this.messageContactList?.querySelector(`[data-contact-id="${charId}"]`)?.focus();
        this.renderChat();
    },

    renderChat() {
        if (!this.currentChatCharId) return;
        const messages = this.getChatHistory(this.currentChatCharId);
        this.chatHistory.innerHTML = '';

        const charConfig = GameConfig.characters[this.currentChatCharId];
        const charName = this.characterName(charConfig);

        // Character Avatar
        let charAvatar = charConfig.icon || "";
        if (!charAvatar && charConfig.sprites) {
            charAvatar = charConfig.sprites.default || charConfig.sprites.normal || "";
        }

        // User Avatar
        const userAvatar = GameConfig.characters[GameConfig.project.protagonist]?.icon || '';

        messages.forEach(msg => {
            const row = document.createElement('div');
            row.className = `message-row ${msg.sender}`;

            const avatarUrl = msg.sender === 'user' ? userAvatar : charAvatar;

            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            if (avatarUrl) avatar.style.backgroundImage = `url('${avatarUrl}')`;
            else avatar.textContent = (msg.sender === 'user' ? this.characterName(GameConfig.project.protagonist) : charName).slice(0, 1);

            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble';

            const bubbleName = document.createElement('div');
            bubbleName.className = 'bubble-name';
            bubbleName.textContent = msg.sender === 'system' ? this.t('systemName') : msg.sender === 'user' ? this.t('you') : charName;

            const bubbleText = document.createElement('div');
            bubbleText.textContent = msg.errorKey ? this.t(msg.errorKey) : msg.kind === 'greeting'
                ? this.getCharPrompt(this.currentChatCharId).greeting : String(msg.text ?? '');

            bubble.append(bubbleName, bubbleText);
            row.append(avatar, bubble);
            this.chatHistory.appendChild(row);
        });

        // Scroll to bottom
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    },

    clearChatHistory() {
        if (!this.currentChatCharId) return;
        const charId = this.currentChatCharId;
        const language = RuntimeState.language;
        this.showConfirmModal(this.t('clearChatConfirm'), () => {
            const key = this.chatConversationKey(charId, language);
            const pending = this.chatRequests.get(key);
            this.chatRequests.delete(key);
            if (pending) window.electronAPI?.cancelChatRequest?.(pending.id).catch(() => {});
            delete this.messageChatsByLanguage[language][charId];
            this.getChatHistory(charId, language);
            this.saveChats();
            if (charId === this.currentChatCharId && language === RuntimeState.language) this.renderChat();
            this.updateChatControls();
        });
    },

    async sendMessage() {
        if (!this.isChatUnlocked()) {
            this.updateChatControls();
            return;
        }
        const text = this.chatInput.value.trim();
        const charId = this.currentChatCharId;
        const language = RuntimeState.language;
        const key = this.chatConversationKey(charId, language);
        if (!text || !charId || !this.chatAvailable || this.chatRequests.has(key)) return;
        const request = { id: `chat-${Date.now()}-${++this.chatRequestCounter}` };
        this.chatRequests.set(key, request);
        this.appendMessage(charId, 'user', text.slice(0, 1000), language);
        this.chatInput.value = '';
        this.chatDrafts.delete(key);
        this.updateChatControls();
        try {
            const reply = await this.callDeepSeekAPI(charId, language, request.id);
            if (this.chatRequests.get(key) === request) this.appendMessage(charId, 'character', reply, language);
        } catch (error) {
            if (this.chatRequests.get(key) !== request) return;
            if (String(error.message).includes('CHAT_CANCELLED')) return;
            const codes = { CHAT_LOCKED: 'chatUnlockRequirement', CHAT_NOT_CONFIGURED: 'chatNotConfigured', CHAT_AUTH_FAILED: 'chatAuthFailed', CHAT_TIMEOUT: 'chatTimeout',
                CHAT_RATE_LIMITED: 'chatRateLimited', CHAT_OFFLINE: 'chatOffline', CHAT_BUSY: 'chatBusy' };
            const errorKey = Object.entries(codes).find(([code]) => String(error.message).includes(code))?.[1] || 'chatFailed';
            this.getChatHistory(charId, language).push({ sender: 'system', errorKey, text: '', timestamp: Date.now() });
            this.saveChats();
            if (charId === this.currentChatCharId && language === RuntimeState.language) this.renderChat();
        } finally {
            if (this.chatRequests.get(key) === request) this.chatRequests.delete(key);
            this.updateChatControls();
        }
    },

    appendMessage(charId, sender, text, language = RuntimeState.language) {
        this.getChatHistory(charId, language).push({ sender, text, timestamp: Date.now() });
        this.saveChats();
        if (this.currentChatCharId === charId && RuntimeState.language === language) {
            this.renderChat();
        }
    },

    saveChats() {
        SaveManager.set('message_history', { version: 2, histories: this.messageChatsByLanguage });
    },

    setChatStatus(status) {
        this.chatHeaderStatus.innerText = status;
    },

    async callDeepSeekAPI(charId, language, requestId) {
        if (!this.isChatUnlocked()) throw new Error('CHAT_LOCKED');
        const promptData = this.getCharPrompt(charId, language);

        // Convert storage history to API format
        const fullHistory = this.getChatHistory(charId, language).filter(msg => msg.sender !== 'system').map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
        }));

        // Limit context to last 20 messages
        const contextMessages = fullHistory.slice(-20);

        const messages = [
            { role: "system", content: promptData.system },
            ...contextMessages
        ];

        const reply = await window.electronAPI.requestChatCompletion(messages, requestId);
        if (typeof reply !== 'string' || !reply.trim()) throw new Error('CHAT_FAILED');
        return reply.trim();
    }
};
