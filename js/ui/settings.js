const SettingsMethods = {
    initializeChatApiSettings() {
        if (!GameConfig.features.chat) return;
        this.chatApiForm = document.getElementById('chat-api-form');
        this.chatApiUrl = document.getElementById('chat-api-url');
        this.chatApiModel = document.getElementById('chat-api-model');
        this.chatApiKey = document.getElementById('chat-api-key');
        this.chatApiKeyToggle = document.getElementById('chat-api-key-toggle');
        this.chatApiStatus = document.getElementById('chat-api-status');
        this.chatApiSave = document.getElementById('chat-api-save');
        this.chatApiClear = document.getElementById('chat-api-clear');
        if (!this.chatApiForm) return;
        this.chatApiLoadVersion = 0;
        this.chatApiStatusKey = this.hasChatApiSettingsBridge() ? 'chatApiNotConfigured' : 'chatApiDesktopOnly';
        this.chatApiForm.addEventListener('submit', event => {
            event.preventDefault();
            this.saveChatApiSettings();
        });
        for (const input of [this.chatApiUrl, this.chatApiModel, this.chatApiKey]) {
            input.addEventListener('input', () => {
                this.chatApiDirty = true;
                this.chatApiStatusKey = 'chatApiDraft';
                this.chatApiError = false;
                this.updateChatApiSettingsText();
            });
        }
        this.chatApiKeyToggle.addEventListener('click', () => {
            this.chatApiKey.type = this.chatApiKey.type === 'password' ? 'text' : 'password';
            this.updateChatApiSettingsText();
        });
        this.chatApiClear.addEventListener('click', () => {
            if (this.chatApiBusy || !this.hasChatApiSettingsBridge()) return;
            this.showConfirmModal(this.t('chatApiClearConfirm'), () => this.clearChatApiSettings());
        });
        this.updateChatApiSettingsText();
        this.setChatApiBusy(false);
    },

    hasChatApiSettingsBridge() {
        const api = window.electronAPI;
        return Boolean(api?.getChatConfig && api?.saveChatConfig && api?.clearChatConfig);
    },

    setChatApiBusy(busy) {
        this.chatApiBusy = busy;
        if (!this.chatApiForm) return;
        const disabled = busy || !this.hasChatApiSettingsBridge();
        for (const control of [this.chatApiUrl, this.chatApiModel, this.chatApiKey,
            this.chatApiKeyToggle, this.chatApiSave, this.chatApiClear]) control.disabled = disabled;
        this.chatApiForm.setAttribute('aria-busy', String(busy));
    },

    updateChatApiSettingsText() {
        if (!this.chatApiForm) return;
        this.chatApiStatus.textContent = this.t(this.chatApiStatusKey || 'chatApiNotConfigured');
        this.chatApiStatus.dataset.error = String(Boolean(this.chatApiError));
        this.chatApiKey.placeholder = this.t(this.chatApiSnapshot?.hasApiKey ? 'chatApiKeySavedPlaceholder' : 'chatApiKeyPlaceholder');
        const visible = this.chatApiKey.type === 'text';
        this.chatApiKeyToggle.textContent = this.t(visible ? 'chatApiHideKey' : 'chatApiShowKey');
        this.chatApiKeyToggle.setAttribute('aria-pressed', String(visible));
    },

    applyChatApiSnapshot(snapshot, statusKey) {
        this.chatApiSnapshot = snapshot;
        this.chatApiUrl.value = snapshot.baseUrl;
        this.chatApiModel.value = snapshot.model;
        this.chatApiKey.value = '';
        this.chatApiKey.type = 'password';
        this.chatApiDirty = false;
        this.chatApiError = Boolean(snapshot.loadError);
        this.chatApiStatusKey = statusKey || (snapshot.loadError ? 'chatApiLoadFailed'
            : !snapshot.hasApiKey ? 'chatApiNotConfigured' : snapshot.usesEnvironmentKey ? 'chatApiUnsaved'
                : snapshot.persistent ? 'chatApiSaved' : 'chatApiSessionOnly');
        this.updateChatApiSettingsText();
    },

    async refreshChatApiSettings() {
        if (!this.chatApiForm || this.chatApiBusy) return;
        if (!this.hasChatApiSettingsBridge()) {
            this.chatApiStatusKey = 'chatApiDesktopOnly';
            this.updateChatApiSettingsText();
            return;
        }
        const version = ++this.chatApiLoadVersion;
        this.chatApiDirty = false;
        this.chatApiStatusKey = 'chatApiLoading';
        this.chatApiError = false;
        this.updateChatApiSettingsText();
        try {
            const snapshot = await window.electronAPI.getChatConfig();
            if (version !== this.chatApiLoadVersion) return;
            if (!this.chatApiDirty) this.applyChatApiSnapshot(snapshot);
            else {
                this.chatApiSnapshot = snapshot;
                this.chatApiStatusKey = 'chatApiDraft';
                this.updateChatApiSettingsText();
            }
        } catch {
            if (version !== this.chatApiLoadVersion) return;
            this.chatApiStatusKey = 'chatApiLoadFailed';
            this.chatApiError = true;
            this.updateChatApiSettingsText();
        }
    },

    async saveChatApiSettings() {
        if (this.chatApiBusy || !this.hasChatApiSettingsBridge()) return;
        const payload = { baseUrl: this.chatApiUrl.value, model: this.chatApiModel.value, apiKey: this.chatApiKey.value };
        await this.changeChatApiSettings(() => window.electronAPI.saveChatConfig(payload));
    },

    async clearChatApiSettings() {
        if (this.chatApiBusy || !this.hasChatApiSettingsBridge()) return;
        await this.changeChatApiSettings(() => window.electronAPI.clearChatConfig(), 'chatApiCleared');
    },

    async changeChatApiSettings(change, successKey) {
        const version = ++this.chatApiLoadVersion;
        this.setChatApiBusy(true);
        this.chatApiStatusKey = 'chatApiSaving';
        this.chatApiError = false;
        this.updateChatApiSettingsText();
        try {
            const snapshot = await change();
            // The main process aborted old requests; ignore any replies already on their way to this renderer.
            this.chatRequests?.clear();
            if (this.chatInput) await this.refreshChatAvailability();
            if (version === this.chatApiLoadVersion) this.applyChatApiSnapshot(snapshot, successKey);
        } catch (error) {
            if (version !== this.chatApiLoadVersion) return;
            const codes = { CHAT_CONFIG_INVALID_URL: 'chatApiInvalidUrl', CHAT_CONFIG_INVALID_MODEL: 'chatApiInvalidModel',
                CHAT_CONFIG_INVALID_KEY: 'chatApiInvalidKey', CHAT_CONFIG_KEY_REQUIRED: 'chatApiKeyRequired' };
            this.chatApiStatusKey = Object.entries(codes).find(([code]) => String(error.message).includes(code))?.[1] || 'chatApiSaveFailed';
            this.chatApiError = true;
            this.updateChatApiSettingsText();
        } finally {
            this.setChatApiBusy(false);
        }
    },

    initializeSettingsTabs() {
        this.settingContent = document.getElementById('setting-content');
        this.settingsTabs = Array.from(document.querySelectorAll('.settings-tab')).filter(tab => {
            const enabled = (tab.dataset.settingTab !== 'chat-api' || GameConfig.features.chat)
                && (tab.dataset.settingTab !== 'achievements' || GameConfig.features.achievements);
            tab.hidden = !enabled;
            return enabled;
        });
        this.settingsPanels = Array.from(document.querySelectorAll('.settings-panel'));

        if (!this.settingsTabs.length || !this.settingsPanels.length) return;

        this.settingsTabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                this.selectSettingsTab(tab.dataset.settingTab);
            });
            tab.addEventListener('keydown', (event) => {
                this.handleSettingsTabKeydown(event, index);
            });
        });

        const initialTab = this.activeSettingsTab || this.settingsTabs[0].dataset.settingTab;
        this.selectSettingsTab(initialTab);
    },

    selectSettingsTab(tabName, { focus = false } = {}) {
        const selectedTab = this.settingsTabs?.find((tab) => tab.dataset.settingTab === tabName);
        if (!selectedTab) return;

        this.activeSettingsTab = tabName;
        if (tabName === 'achievements') AchievementManager.refresh();
        this.settingsTabs.forEach((tab) => {
            const isActive = tab === selectedTab;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
            tab.tabIndex = isActive ? 0 : -1;
        });

        this.settingsPanels.forEach((panel) => {
            const isActive = panel.dataset.settingPanel === tabName;
            panel.classList.toggle('active', isActive);
            panel.hidden = !isActive;
        });

        this.setLanguageSelectOpen(false);
        if (this.settingContent) this.settingContent.scrollTop = 0;
        if (focus) selectedTab.focus();
    },

    handleSettingsTabKeydown(event, currentIndex) {
        const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
        if (!keys.includes(event.key) || !this.settingsTabs?.length) return;

        event.preventDefault();
        let nextIndex = currentIndex;
        if (event.key === 'ArrowLeft') {
            nextIndex = (currentIndex - 1 + this.settingsTabs.length) % this.settingsTabs.length;
        } else if (event.key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % this.settingsTabs.length;
        } else if (event.key === 'Home') {
            nextIndex = 0;
        } else if (event.key === 'End') {
            nextIndex = this.settingsTabs.length - 1;
        }

        this.selectSettingsTab(this.settingsTabs[nextIndex].dataset.settingTab, { focus: true });
    },

    openSettings() {
        if (this.autoTimeout != null) clearTimeout(this.autoTimeout);
        this.autoTimeout = null;
        this.enterOverlay('settings');
        this.settingModal.classList.add('visible');
        this.settingModal.setAttribute('aria-hidden', 'false');
        if (this.bgmSlider) {
            this.bgmSlider.value = RuntimeState.bgmVolume;
            this.bgmValue.innerText = Math.round(RuntimeState.bgmVolume * 100) + "%";
            this.updateSettingsSliderFill(this.bgmSlider, RuntimeState.bgmVolume);
        }
        if (this.seSlider) {
            this.seSlider.value = RuntimeState.seVolume;
            this.seValue.innerText = Math.round(RuntimeState.seVolume * 100) + "%";
            this.updateSettingsSliderFill(this.seSlider, RuntimeState.seVolume);
        }
        if (this.voiceSlider) {
            this.voiceSlider.value = RuntimeState.voiceVolume;
            this.voiceValue.innerText = Math.round(RuntimeState.voiceVolume * 100) + "%";
            this.updateSettingsSliderFill(this.voiceSlider, RuntimeState.voiceVolume);
        }
        this.renderVoiceCharacterSettings();
        this.syncFullscreenToggle();
        this.syncPlayerSpriteSetting();
        this.syncLanguageSetting();
        this.refreshChatApiSettings();

        const clearBtn = document.getElementById('clear-data-btn');
        if (clearBtn) {
            clearBtn.onclick = () => this.showConfirmModal(this.t('clearConfirm'), () => this.handleClearData());
        }
    },

    syncPlayerSpriteSetting() {
        for (const control of [this.playerSpriteToggle, this.startupPlayerSpriteToggle]) {
            if (control) control.checked = RuntimeState.showPlayerSprite;
        }
    },

    handlePlayerSpriteChange(enabled) {
        RuntimeState.setShowPlayerSprite(enabled);
        this.syncPlayerSpriteSetting();
        this.syncPlayerSpriteVisibility();
    },

    handleClearData() {
        SaveManager.clearGameData();
        this.showSystemModal(this.t('dataCleared'), () => this.returnToTitle());
    },

    closeSettings() {
        this.chatApiLoadVersion++;
        if (this.chatApiKey) {
            this.chatApiKey.value = '';
            this.chatApiKey.type = 'password';
        }
        this.setLanguageSelectOpen(false);
        this.settingModal.classList.remove('visible');
        this.settingModal.setAttribute('aria-hidden', 'true');
        this.leaveOverlay('settings');
        this.maybeScheduleAutoAdvance();
    },

    updateSettingsSliderFill(slider, value) {
        if (!slider) return;
        const min = Number(slider.min) || 0;
        const max = Number(slider.max) || 1;
        const numericValue = Math.max(min, Math.min(max, Number(value)));
        const fill = max === min ? 0 : ((numericValue - min) / (max - min)) * 100;
        slider.style.setProperty('--setting-fill', `${fill}%`);
    },

    handleVolumeChange(type, value) {
        const floatVal = parseFloat(value);
        if (type === 'bgm') {
            const bgmVolume = RuntimeState.setBgmVolume(floatVal);
            this.bgmValue.innerText = Math.round(bgmVolume * 100) + "%";
            this.updateSettingsSliderFill(this.bgmSlider, bgmVolume);

            // Update current BGM immediately
            if (this.bgm) {
                this.updateBgmVolume();
            }
        } else if (type === 'se') {
            const seVolume = RuntimeState.setSeVolume(floatVal);
            this.seValue.innerText = Math.round(seVolume * 100) + "%";
            this.updateSettingsSliderFill(this.seSlider, seVolume);
            this.updateActiveSoundEffectVolumes();
        } else if (type === 'voice') {
            const voiceVolume = RuntimeState.setVoiceVolume(floatVal);
            this.voiceValue.innerText = Math.round(voiceVolume * 100) + "%";
            this.updateSettingsSliderFill(this.voiceSlider, voiceVolume);
            this.setCurrentVoiceVolume();
        }
    },

    renderVoiceCharacterSettings() {
        if (!this.voiceCharacterSettings || typeof VoiceManifest === 'undefined') return;
        this.voiceCharacterSettings.innerHTML = '';

        const nameKeys = {};

        Object.entries(VoiceManifest.speakers).forEach(([speakerId, coverage]) => {
            if (!coverage.available) return;

            const row = document.createElement('div');
            row.className = 'voice-character-row';

            const description = document.createElement('span');
            description.className = 'voice-character-description';

            const name = document.createElement('span');
            name.className = 'voice-character-name';
            const nameKey = nameKeys[speakerId];
            name.innerText = nameKey
                ? this.t(nameKey)
                : (GameConfig.characters[speakerId]?.name || speakerId);

            const coverageText = document.createElement('span');
            coverageText.className = 'voice-character-coverage';
            coverageText.innerText = this.t('voiceCoverage', coverage.available, coverage.total);

            const toggle = document.createElement('input');
            toggle.type = 'checkbox';
            toggle.checked = RuntimeState.isVoiceEnabled(speakerId);
            toggle.setAttribute('aria-label', name.innerText);
            toggle.addEventListener('change', () => {
                RuntimeState.setVoiceEnabled(speakerId, toggle.checked);
                slider.disabled = !toggle.checked;
                row.classList.toggle('voice-character-row--muted', !toggle.checked);
                if (!toggle.checked && this.currentVoiceEntry?.speaker === speakerId) {
                    this.stopVoice({ scheduleAuto: true });
                }
                if (this.historyVoicePlayback?.voice.speaker === speakerId) this.updateHistoryVoiceVolume();
            });

            const switchControl = document.createElement('label');
            switchControl.className = 'setting-switch';

            const switchVisual = document.createElement('span');
            switchVisual.className = 'setting-switch-visual';
            switchVisual.setAttribute('aria-hidden', 'true');

            switchControl.appendChild(toggle);
            switchControl.appendChild(switchVisual);

            description.appendChild(name);
            description.appendChild(coverageText);
            row.appendChild(description);
            row.appendChild(switchControl);

            const volumeControl = document.createElement('div');
            volumeControl.className = 'setting-volume-control voice-character-volume';
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'voice-character-slider';
            slider.id = `voice-character-volume-${speakerId}`;
            slider.min = '0';
            slider.max = '1';
            slider.step = '0.01';
            slider.value = RuntimeState.getVoiceCharacterVolume(speakerId);
            slider.disabled = !toggle.checked;
            slider.setAttribute('aria-label', this.t('voiceCharacterVolume', name.innerText));
            row.classList.toggle('voice-character-row--muted', !toggle.checked);

            const value = document.createElement('output');
            value.setAttribute('for', slider.id);
            const syncValue = (volume) => {
                value.textContent = `${Math.round(volume * 100)}%`;
                slider.setAttribute('aria-valuetext', value.textContent);
                this.updateSettingsSliderFill(slider, volume);
            };
            syncValue(Number(slider.value));
            slider.addEventListener('input', () => {
                syncValue(RuntimeState.setVoiceCharacterVolume(speakerId, slider.value));
                if (this.currentVoiceEntry?.speaker === speakerId
                    || this.historyVoicePlayback?.voice.speaker === speakerId) this.setCurrentVoiceVolume();
            });
            volumeControl.append(slider, value);
            row.appendChild(volumeControl);
            this.voiceCharacterSettings.appendChild(row);
        });
    },

    async syncFullscreenToggle() {
        if (!this.fullscreenToggle) return;

        if (window.electronAPI?.getFullscreen) {
            try {
                this.fullscreenToggle.checked = await window.electronAPI.getFullscreen();
                return;
            } catch (error) {
                console.error('Unable to read fullscreen state:', error);
            }
        }

        this.fullscreenToggle.checked = !!document.fullscreenElement;
    },

    async handleFullscreenChange(isChecked) {
        if (window.electronAPI?.setFullscreen) {
            try {
                const actualState = await window.electronAPI.setFullscreen(!!isChecked);
                this.fullscreenToggle.checked = !!actualState;
                return;
            } catch (error) {
                console.error('Fullscreen failed:', error);
                await this.syncFullscreenToggle();
                return;
            }
        }

        try {
            if (isChecked) {
                await document.documentElement.requestFullscreen();
            } else if (document.fullscreenElement) {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.error('Fullscreen failed:', error);
        } finally {
            this.fullscreenToggle.checked = !!document.fullscreenElement;
        }
    },

    setLanguageSelectOpen(isOpen) {
        if (!this.languageSelect) return;
        this.languageSelect.classList.toggle('open', !!isOpen);
        this.languageSelectTrigger?.setAttribute('aria-expanded', String(!!isOpen));
        const options = this.languageSelect.querySelector('.custom-select-options');
        if (options) {
            options.inert = !isOpen;
            options.setAttribute('aria-hidden', String(!isOpen));
        }
        this.languageSelect.querySelectorAll('.custom-select-option').forEach(option => { option.tabIndex = isOpen ? 0 : -1; });
    },

    syncLanguageSetting() {
        if (this.languageSelectText) {
            const curLang = GameConfig.languages[RuntimeState.language];
            const optionMap = { zh: '中文', ja: '日本語', en: 'English' };
            this.languageSelectText.innerText = curLang
                ? (curLang.languageName || optionMap[RuntimeState.language])
                : optionMap[RuntimeState.language];
        }

        this.languageSelect?.querySelectorAll('.custom-select-option').forEach((option) => {
            const isSelected = option.getAttribute('data-value') === RuntimeState.language;
            option.classList.toggle('selected', isSelected);
            option.setAttribute('aria-selected', String(isSelected));
        });
    },

    handleLanguageChange(langCode) {
        this.stopVoice({ scheduleAuto: true });
        RuntimeState.setLanguage(langCode);
        this.applyLanguage(langCode);
        this.syncLanguageSetting();
        this.renderVoiceCharacterSettings();
    }
};
