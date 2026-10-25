// First-launch preferences extend the same settings API used by the menu.
// Edits stay in a draft until the player explicitly confirms the setup.
Object.assign(SettingsMethods, {
    initializeStartupSetup() {
        this.startupSetupDraft = {
            language: this.getInitialStartupLanguage(),
            showPlayerSprite: RuntimeState.showPlayerSprite,
            bgm: RuntimeState.bgmVolume,
            se: RuntimeState.seVolume,
            voice: RuntimeState.voiceVolume
        };
        this.startupPreview = null;
        this.startupPreviewStatusKey = '';
        this.startupVolumeSliders = Array.from(
            this.startupLanguageDialog?.querySelectorAll('[data-startup-volume]') || []
        );
        this.startupPreviewButtons = Array.from(
            this.startupLanguageDialog?.querySelectorAll('[data-startup-preview]') || []
        );
        this.startupAudioStatus = document.getElementById('startup-audio-status');
        this.startupSetupConfirm = document.getElementById('startup-setup-confirm');
        this.startupSpritePreview = document.getElementById('startup-sprite-preview');
        this.startupContentNotice = document.getElementById('startup-content-notice');
        this.initializeStartupTextSlots();
        const image = document.getElementById('startup-protagonist-image');
        const protagonist = GameConfig.characters[GameConfig.project.protagonist];
        if (image && protagonist?.sprites?.default) image.src = protagonist.sprites.default;
        else if (image) { image.hidden = true; this.startupSpritePreview.textContent = this.characterName(protagonist); }

        this.startupLanguageButtons.forEach(button => {
            button.addEventListener('click', () => this.selectStartupLanguage(button.dataset.startupLanguage));
        });
        this.startupPlayerSpriteToggle?.addEventListener('change', event => {
            if (!this.isStartupSetupOpen()) return;
            this.startupSetupDraft.showPlayerSprite = event.target.checked;
            this.renderStartupSetup();
        });
        this.startupVolumeSliders.forEach(slider => {
            slider.addEventListener('input', () => {
                if (!this.isStartupSetupOpen()) return;
                const type = slider.dataset.startupVolume;
                this.startupSetupDraft[type] = Math.max(0, Math.min(1, Number(slider.value) || 0));
                if (!this.startupPreview) this.startupPreviewStatusKey = '';
                this.syncStartupVolumeControls();
                this.updateStartupPreviewVolume();
                this.renderStartupPreviewState();
            });
        });
        this.startupPreviewButtons.forEach(button => {
            button.addEventListener('click', () => this.playStartupPreview(button.dataset.startupPreview));
        });
        this.startupSetupConfirm?.addEventListener('click', () => this.confirmStartupSetup());
        this.startupLanguageOverlay?.addEventListener('keydown', event => {
            event.stopPropagation();
            if (this.startupNoticeActive) {
                if (['Tab', 'Enter', ' ', 'Escape'].includes(event.key)) event.preventDefault();
                return;
            }
            if (!this.isStartupSetupOpen()) return;
            if (event.key === 'Tab') {
                const controls = Array.from(this.startupLanguageDialog.querySelectorAll(
                    'button:not(:disabled), input:not(:disabled)'
                ));
                const index = controls.indexOf(document.activeElement);
                event.preventDefault();
                const next = index < 0 ? (event.shiftKey ? controls.length - 1 : 0)
                    : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
                controls[next]?.focus({ preventScroll: true });
            } else if (this.startupLanguageButtons.includes(document.activeElement)
                && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
                const index = this.startupLanguageButtons.indexOf(document.activeElement);
                const next = (index + (event.key === 'ArrowLeft' ? -1 : 1)
                    + this.startupLanguageButtons.length) % this.startupLanguageButtons.length;
                event.preventDefault();
                const button = this.startupLanguageButtons[next];
                this.selectStartupLanguage(button.dataset.startupLanguage);
                button.focus({ preventScroll: true });
            } else if (event.key === 'Escape') {
                event.preventDefault();
                this.stopStartupPreview();
            }
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.stopStartupPreview();
        });
        window.addEventListener('pagehide', () => this.stopStartupPreview());
        this.renderStartupSetup();
    },

    getInitialStartupLanguage() {
        const saved = SaveManager.get('language');
        if (['zh', 'ja', 'en'].includes(saved)) return saved;
        // Suggest a supported system/browser language for the setup, without
        // saving a choice until the player explicitly confirms it.
        const preferences = [...(navigator.languages || []), navigator.language];
        for (const preference of preferences) {
            const language = String(preference || '').toLowerCase().split(/[-_]/)[0];
            if (['zh', 'ja', 'en'].includes(language)) return language;
        }
        return RuntimeState.language;
    },

    pauseStartupAudio() {
        this.bgm?.pause();
        this.clearBgmFadeIntervals();
        if (this.startupVoiceAudio) {
            this.startupVoiceAudio.onended = null;
            this.startupVoiceAudio.onerror = null;
            this.startupVoiceAudio.pause();
        }
    },

    showStartupNotice() {
        if (!GameConfig.features.startupNotice) { this.showStartupMenu(); return; }
        const notice = this.startupContentNotice;
        if (!notice || !this.startupLanguageOverlay) {
            this.completeStartup();
            return;
        }
        // Setup has already been confirmed; always use the player's choice,
        // even if writing their preference to storage was unavailable.
        const language = RuntimeState.language;
        const ui = GameConfig.languages[language]?.ui || GameConfig.languages.zh.ui;
        notice.lang = language === 'zh' ? 'zh-CN' : language;
        notice.querySelectorAll('[data-startup-notice-i18n]').forEach(element => {
            const key = element.dataset.startupNoticeI18n;
            element.textContent = ui[key] || GameConfig.languages.zh.ui[key] || key;
        });
        this.pauseStartupAudio();
        this.startupLanguageOverlay.hidden = false;
        if (this.startupLanguageDialog) this.startupLanguageDialog.hidden = true;
        this.startupNoticeActive = true;
        this.setGameState(GameState.TRANSITION);
        notice.hidden = false;
        notice.focus({ preventScroll: true });

        const timing = GameConfig.startupNotice || {};
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const fadeIn = reducedMotion ? 180 : timing.fadeInMs ?? 800;
        const hold = timing.holdMs?.[language] ?? 4200;
        const fadeOut = reducedMotion ? 180 : timing.fadeOutMs ?? 900;
        const duration = fadeIn + hold + fadeOut;
        const scope = new ActivityScope();
        this.startupNoticeScope = scope;
        const animation = notice.animate([
            { opacity: 0, offset: 0, easing: 'ease-in-out' },
            { opacity: 1, offset: fadeIn / duration },
            { opacity: 1, offset: (fadeIn + hold) / duration, easing: 'ease-in-out' },
            { opacity: 0, offset: 1 }
        ], { duration, fill: 'forwards' });
        scope.defer(() => animation.cancel());
        scope.listen(document, 'visibilitychange', () => {
            if (document.hidden) animation.pause();
            else animation.play();
        });
        scope.listen(window, 'pagehide', event => {
            if (event.persisted) animation.pause();
            else this.clearStartupNotice();
        });
        scope.listen(window, 'pageshow', () => {
            if (!document.hidden) animation.play();
        });
        if (document.hidden) animation.pause();
        animation.finished.then(() => {
            if (scope.closed || this.startupNoticeScope !== scope) return;
            this.clearStartupNotice();
            this.completeStartup();
        }, () => { /* Cancellation during page teardown is intentional. */ });
    },

    clearStartupNotice() {
        this.startupNoticeScope?.clear();
        this.startupNoticeScope = null;
        this.startupNoticeActive = false;
        if (this.startupContentNotice) this.startupContentNotice.hidden = true;
    },

    initializeStartupTextSlots() {
        this.startupTextSlots = new Map();
        if (!this.startupLanguageDialog) return;
        const languages = ['zh', 'ja', 'en'];
        const translate = (language, key) => GameConfig.languages[language]?.ui[key]
            || GameConfig.languages.zh.ui[key] || key;
        const variants = keys => languages.flatMap(language => keys.map(key => ({
            language,
            text: translate(language, key)
        })));
        const reserve = (element, translations) => {
            if (!element) return;
            const visible = document.createElement('span');
            visible.className = 'startup-localized-text';
            visible.textContent = element.textContent;
            const placeholders = translations.map(({ language, text }) => {
                const placeholder = document.createElement('span');
                placeholder.className = 'startup-text-reserve';
                placeholder.lang = language === 'zh' ? 'zh-CN' : language;
                placeholder.setAttribute('aria-hidden', 'true');
                placeholder.textContent = text;
                return placeholder;
            });
            // All locales share one grid cell. Invisible copies reserve the
            // longest wrapping/width without clipping text or measuring pixels.
            element.classList.add('startup-text-slot');
            element.replaceChildren(visible, ...placeholders);
            this.startupTextSlots.set(element, visible);
        };
        this.startupLanguageDialog.querySelectorAll('[data-startup-i18n]').forEach(element => {
            reserve(element, variants([element.dataset.startupI18n]));
        });
        this.startupPreviewButtons.forEach(button => {
            reserve(button.querySelector('[data-startup-preview-label]'),
                variants(['startupListen', 'startupStop']));
        });
        const statusVariants = variants([
            'startupPreviewFinished', 'startupPreviewError', 'startupPreviewMuted'
        ]);
        languages.forEach(language => {
            ['bgmVolume', 'seVolume', 'voiceVolume'].forEach(key => {
                statusVariants.push({
                    language,
                    text: translate(language, 'startupPreviewPlaying')
                        .replace('%s', translate(language, key))
                });
            });
        });
        reserve(this.startupAudioStatus, statusVariants);
    },

    setStartupText(element, text) {
        if (!element) return;
        const target = this.startupTextSlots?.get(element) || element;
        target.textContent = text;
    },

    isStartupSetupOpen() {
        return this.startupLanguageRequired && this.startupLanguageDialog
            && !this.startupLanguageDialog.hidden;
    },

    startupT(key, ...args) {
        const language = this.startupSetupDraft?.language || RuntimeState.language;
        let text = GameConfig.languages[language]?.ui[key] || GameConfig.languages.zh.ui[key] || key;
        args.forEach(arg => { text = text.replace('%s', arg); });
        return text;
    },

    startupVolumeLabel(type) {
        return this.startupT({ bgm: 'bgmVolume', se: 'seVolume', voice: 'voiceVolume' }[type]);
    },

    showStartupSetup() {
        // Keep the menu/remaining logo audio out of the calibration previews.
        this.pauseStartupAudio();
        this.startupLanguageDialog.hidden = false;
        this.enterOverlay('startup-language');
        this.renderStartupSetup();
        // Observe unscaled layout: transforms do not trigger this observer, so
        // fitting remains stable when fonts, text compensation or bounds change.
        if (!this.startupSetupResizeObserver) {
            this.startupSetupResizeObserver = new ResizeObserver(() => this.fitStartupSetup());
            this.startupSetupResizeObserver.observe(this.startupLanguageDialog);
            this.startupSetupResizeObserver.observe(this.startupLanguageOverlay);
        }
        this.startupLanguageButtons.find(button =>
            button.dataset.startupLanguage === this.startupSetupDraft.language
        )?.focus({ preventScroll: true });
    },

    fitStartupSetup() {
        if (!this.isStartupSetupOpen()) return;
        const dialog = this.startupLanguageDialog;
        const overlay = this.startupLanguageOverlay;
        const width = dialog.offsetWidth;
        const height = dialog.offsetHeight;
        if (!overlay || width <= 0 || height <= 0) return;
        const scale = Math.min(1,
            Math.max(1, overlay.clientWidth - 80) / width,
            Math.max(1, overlay.clientHeight - 80) / height);
        dialog.style.setProperty('--startup-layout-scale', String(scale));
    },

    renderStartupSetup() {
        if (!this.startupLanguageDialog || !this.startupSetupDraft) return;
        this.startupLanguageDialog.lang = this.startupSetupDraft.language === 'zh'
            ? 'zh-CN' : this.startupSetupDraft.language;
        this.startupLanguageDialog.querySelectorAll('[data-startup-i18n]').forEach(element => {
            this.setStartupText(element, this.startupT(element.dataset.startupI18n));
        });
        this.startupLanguageButtons.forEach(button => {
            const selected = button.dataset.startupLanguage === this.startupSetupDraft.language;
            button.classList.toggle('selected', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
        if (this.startupPlayerSpriteToggle) {
            this.startupPlayerSpriteToggle.checked = this.startupSetupDraft.showPlayerSprite;
        }
        this.startupSpritePreview?.classList.toggle('is-sprite-hidden', !this.startupSetupDraft.showPlayerSprite);
        this.syncStartupVolumeControls();
        this.renderStartupPreviewState();
        this.fitStartupSetup();
    },

    syncStartupVolumeControls() {
        this.startupVolumeSliders.forEach(slider => {
            const type = slider.dataset.startupVolume;
            const volume = this.startupSetupDraft[type];
            slider.value = volume;
            slider.setAttribute('aria-valuetext', `${Math.round(volume * 100)}%`);
            this.updateSettingsSliderFill(slider, volume);
            const output = document.getElementById(`startup-${type}-value`);
            if (output) output.textContent = `${Math.round(volume * 100)}%`;
        });
    },

    getStartupPreviewVolume(type) {
        const sample = GameConfig.startupAudioPreview[type];
        const characterGain = type === 'voice' ? RuntimeState.getVoiceCharacterVolume('player') : 1;
        return Math.max(0, Math.min(1, this.startupSetupDraft[type]
            * (sample.volume ?? 1) * characterGain));
    },

    updateStartupPreviewVolume() {
        const preview = this.startupPreview;
        if (preview) preview.audio.volume = this.getStartupPreviewVolume(preview.type) * preview.gain;
    },

    renderStartupPreviewState() {
        this.startupPreviewButtons.forEach(button => {
            const type = button.dataset.startupPreview;
            button.disabled = !GameConfig.startupAudioPreview[type];
            const playing = this.startupPreview?.type === type;
            const action = this.startupT(playing ? 'startupStop' : 'startupListen');
            button.classList.toggle('playing', playing);
            button.setAttribute('aria-pressed', String(playing));
            button.setAttribute('aria-label', `${action} · ${this.startupVolumeLabel(type)}`);
            this.setStartupText(button.querySelector('[data-startup-preview-label]'), action);
            button.querySelector('[aria-hidden="true"]').textContent = playing ? '■' : '▶';
        });
        if (!this.startupAudioStatus) return;
        const preview = this.startupPreview;
        const status = preview
            ? this.getStartupPreviewVolume(preview.type) === 0
                ? this.startupT('startupPreviewMuted')
                : this.startupT('startupPreviewPlaying', this.startupVolumeLabel(preview.type))
            : this.startupPreviewStatusKey ? this.startupT(this.startupPreviewStatusKey) : '';
        this.setStartupText(this.startupAudioStatus, status);
        this.startupAudioStatus.classList.toggle('is-error', this.startupPreviewStatusKey === 'startupPreviewError');
    },

    playStartupPreview(type) {
        if (!this.isStartupSetupOpen() || !GameConfig.startupAudioPreview[type]) return;
        if (this.startupPreview?.type === type) {
            this.stopStartupPreview();
            return;
        }
        this.stopStartupPreview();
        if (this.getStartupPreviewVolume(type) === 0) {
            this.startupPreviewStatusKey = 'startupPreviewMuted';
            this.renderStartupPreviewState();
            return;
        }
        const sample = GameConfig.startupAudioPreview[type];
        const voice = type === 'voice' && typeof VoiceManifest !== 'undefined'
            ? Object.values(VoiceManifest.entries).find(entry => entry.id === sample.voiceId) : null;
        const source = type === 'voice' ? voice?.src
            : (type === 'bgm' ? GameConfig.bgm : GameConfig.soundEffects)[sample.assetKey];
        if (!source) {
            this.startupPreviewStatusKey = 'startupPreviewError';
            this.renderStartupPreviewState();
            return;
        }
        const audio = new Audio(source);
        const preview = { audio, type, gain: type === 'se' ? 1 : 0, started: false,
            timeout: null, loadingTimeout: null, fadeInterval: null };
        this.startupPreview = preview;
        audio.loop = false;
        audio.volume = this.getStartupPreviewVolume(type) * preview.gain;
        const finish = (status) => {
            if (this.startupPreview !== preview) return;
            this.stopStartupPreview();
            this.startupPreviewStatusKey = status;
            this.renderStartupPreviewState();
        };
        const start = () => {
            if (this.startupPreview !== preview || preview.started) return;
            preview.started = true;
            clearTimeout(preview.loadingTimeout);
            preview.loadingTimeout = null;
            if (preview.gain < 1) {
                const startedAt = performance.now();
                preview.fadeInterval = setInterval(() => {
                    if (this.startupPreview !== preview) return;
                    preview.gain = Math.min(1, (performance.now() - startedAt) / 120);
                    this.updateStartupPreviewVolume();
                    if (preview.gain >= 1) {
                        clearInterval(preview.fadeInterval);
                        preview.fadeInterval = null;
                    }
                }, 20);
            }
            preview.timeout = setTimeout(() => finish('startupPreviewFinished'), (sample.seconds || 8) * 1000);
        };
        audio.onplaying = start;
        audio.onended = () => finish('startupPreviewFinished');
        audio.onerror = () => finish('startupPreviewError');
        preview.loadingTimeout = setTimeout(() => finish('startupPreviewError'), 10000);
        this.renderStartupPreviewState();
        try {
            const result = audio.play();
            if (result && typeof result.then === 'function') {
                result.then(start).catch(() => finish('startupPreviewError'));
            }
        } catch (error) {
            finish('startupPreviewError');
        }
    },

    stopStartupPreview() {
        const preview = this.startupPreview;
        this.startupPreview = null;
        if (preview) {
            clearTimeout(preview.timeout);
            clearTimeout(preview.loadingTimeout);
            clearInterval(preview.fadeInterval);
            preview.audio.onplaying = null;
            preview.audio.onended = null;
            preview.audio.onerror = null;
            preview.audio.pause();
            preview.audio.removeAttribute('src');
            preview.audio.load();
        }
        this.startupPreviewStatusKey = '';
        this.renderStartupPreviewState();
    },

    confirmStartupSetup() {
        if (!this.isStartupSetupOpen()) return;
        const draft = this.startupSetupDraft;
        if (!['zh', 'ja', 'en'].includes(draft.language)) return;
        this.stopStartupPreview();
        RuntimeState.setBgmVolume(draft.bgm);
        RuntimeState.setSeVolume(draft.se);
        RuntimeState.setVoiceVolume(draft.voice);
        this.handlePlayerSpriteChange(draft.showPlayerSprite);
        RuntimeState.setLanguage(draft.language);
        this.applyLanguage(draft.language);
        this.syncLanguageSetting();
        this.updateBgmVolume();
        this.updateActiveSoundEffectVolumes();
        this.startupLanguageRequired = false;
        this.startupSetupResizeObserver?.disconnect();
        this.startupSetupResizeObserver = null;
        this.startupLanguageDialog.hidden = true;
        this.leaveOverlay('startup-language', GameState.TRANSITION);
        this.completeStartup();
    }
});
