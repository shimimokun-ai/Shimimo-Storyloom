class GameEngine {
    constructor() {
        this.initializeCore();
        this.initializeMainMenuAndGallery();
        this.initializeMenusAndModals();
        this.initializeSettingsAndGlobalInput();
        this.initializeCGGallery();
        this.initializeAudioAndDialogueControls();
        this.initializeMessageSystem();
        this.initializeEndingCredits();
        this.setGameState(GameState.MENU);
        this.initializeFeatureVisibility();
        this.initializeStartupSequence();
    }

    initializeCore() {
        this.activityScope = null;
        this.gameState = GameState.MENU;
        this.stateReturnPoints = new Map();
        this.sceneLoadToken = 0;
        this.storyWaitTimer = null;
        this.currentScene = [];
        this.currentSceneId = null;
        this.currentSceneLanguage = null;
        this.currentIndex = 0;
        this.isTyping = false;
        this.isTextFinished = false;
        this.currentSpeaker = null;

        // DOM Elements
        this.bgLayer = document.getElementById('background-layer');
        this.charLayer = document.getElementById('character-layer');
        this.syncPlayerSpriteVisibility();
        this.uiLayer = document.getElementById('ui-layer');
        this.dialogueBox = document.getElementById('dialogue-container');
        this.nameBox = document.getElementById('name-box');
        this.textBox = document.getElementById('text-box');
        this.choiceBox = document.getElementById('choice-container');

        // Safety Check for Config
        if (typeof GameConfig === 'undefined') {
            console.error("GameConfig is missing!");
            // We can't use showSystemModal yet as it expects DOM binding? 
            // Actually bindings are below. Let's alert for now or bind early.
            alert("Fatal Error: GameConfig is not loaded. Check console.");
        }

        this.mainMenu = document.getElementById('main-menu');
        this.chapterTitle = document.getElementById('chapter-title');

        // Bindings
        // Initialize Title Click Counter
        this.titleClickCount = 0;
        const titleEl = document.querySelector('.title');
        if (titleEl) {
            titleEl.addEventListener('click', () => this.handleTitleClick());
            // Make title interactive
            titleEl.style.cursor = 'pointer';
        }
    }

    initializeMainMenuAndGallery() {
        // Main Menu BG Switcher
        this.mainMenuBgSwitcher = document.getElementById('main-menu-bg-switcher');
        this.mainMenuIndex = MainMenuBackground.normalize(
            SaveManager.get('main_menu_bg', MainMenuBackground.defaultIndex)
        );
        if (this.mainMenu) {
            this.mainMenuBackground = new MainMenuBackground(this.mainMenu, {
                onChange: index => SaveManager.set('main_menu_bg', index)
            });
        }
        this.updateMainMenuBg();

        if (this.mainMenuBgSwitcher) {
            this.mainMenuBgSwitcher.addEventListener('click', () => this.switchMainMenuBg());
        }

        // Character Gallery UI
        this.charGalleryModal = document.getElementById('character-gallery-modal');
        this.charListContainer = document.getElementById('character-list-container');
        this.charDetailName = document.getElementById('char-detail-name');
        this.charDetailIcon = document.getElementById('char-detail-icon');
        this.charDetailRole = document.getElementById('char-detail-role');
        // REPLACED charDetailDesc with container
        this.charDetailDescContainer = document.getElementById('char-detail-desc-container');
        this.charDetailImage = document.getElementById('char-detail-image');

        // Global Unlock Logic for Gallery Button - ALWAYS VISIBLE now
        const charBtn = document.getElementById('characters-btn');
        if (charBtn) {
            charBtn.classList.remove('locked');
            charBtn.onclick = () => this.openCharacterGallery();
        }
        // Legacy code removed: if (localStorage...)

        const charGalleryClose = document.getElementById('character-gallery-close');
        if (charGalleryClose) charGalleryClose.onclick = () => this.closeCharacterGallery();
    }

    initializeMenusAndModals() {
        // Load Menu Bindings
        this.loadModal = document.getElementById('load-menu-modal');
        this.loadContent = document.getElementById('load-menu-content');
        this.loadClose = document.getElementById('load-menu-close');
        this.loadBtn = document.getElementById('load-btn');

        if (this.loadClose) {
            this.loadClose.addEventListener('click', () => this.closeLoadMenu());
        }

        // Generic System Modal Bindings
        this.sysModal = document.getElementById('system-modal');
        this.sysText = document.getElementById('system-modal-text');
        this.sysOk = document.getElementById('system-modal-ok');

        if (this.sysOk) {
            this.sysOk.addEventListener('click', () => this.closeSystemModal());
        }

        // Confirm Modal Bindings
        this.confirmModal = document.getElementById('confirm-modal');
        this.confirmText = document.getElementById('confirm-modal-text');
        this.confirmOk = document.getElementById('confirm-modal-ok');
        this.confirmCancel = document.getElementById('confirm-modal-cancel');

        if (this.confirmCancel) {
            this.confirmCancel.addEventListener('click', () => this.closeConfirmModal());
        }

        // Load Button - ALWAYS UNLOCKED
        this.updateLoadButtonState();

        const startBtn = document.getElementById('start-btn');
        if (startBtn) startBtn.addEventListener('click', () => this.startGame());
        if (this.loadBtn) this.loadBtn.addEventListener('click', () => this.openLoadMenu());

        // CG Button Logic - ALWAYS UNLOCKED
        this.cgBtn = document.getElementById('cg-btn');
        if (this.cgBtn) {
            this.cgBtn.classList.remove('locked');
            this.cgBtn.style.filter = 'none';
            this.cgBtn.addEventListener('click', () => this.openCGGallery());
        }
    }

    initializeSettingsAndGlobalInput() {
        // Settings Bindings
        this.settingModal = document.getElementById('setting-modal');
        this.settingClose = document.getElementById('setting-close');
        this.bgmSlider = document.getElementById('bgm-slider');
        this.bgmValue = document.getElementById('bgm-value');
        this.seSlider = document.getElementById('se-slider');
        this.seValue = document.getElementById('se-value');
        this.voiceSlider = document.getElementById('voice-slider');
        this.voiceValue = document.getElementById('voice-value');
        this.voiceCharacterSettings = document.getElementById('voice-character-settings');
        this.fullscreenToggle = document.getElementById('fullscreen-toggle');
        this.playerSpriteToggle = document.getElementById('show-player-sprite');
        this.syncPlayerSpriteSetting();

        if (this.settingClose) {
            this.settingClose.addEventListener('click', () => this.closeSettings());
        }

        if (this.bgmSlider) {
            this.bgmSlider.addEventListener('input', (e) => this.handleVolumeChange('bgm', e.target.value));
        }

        if (this.seSlider) {
            this.seSlider.addEventListener('input', (e) => this.handleVolumeChange('se', e.target.value));
        }

        if (this.voiceSlider) {
            this.voiceSlider.addEventListener('input', (e) => this.handleVolumeChange('voice', e.target.value));
        }

        if (this.fullscreenToggle) {
            this.fullscreenToggle.addEventListener('change', (e) => this.handleFullscreenChange(e.target.checked));
        }

        this.playerSpriteToggle?.addEventListener('change', event => {
            this.handlePlayerSpriteChange(event.target.checked);
        });

        // Language Select Binding
        this.languageSelect = document.getElementById('language-select');
        this.languageSelectText = document.querySelector('.custom-select-text');
        this.languageSelectTrigger = document.querySelector('.custom-select-trigger');
        this.initializeSettingsTabs();
        this.initializeChatApiSettings();

        if (this.languageSelectTrigger) {
            this.languageSelectTrigger.addEventListener('click', () => {
                this.setLanguageSelectOpen(!this.languageSelect.classList.contains('open'));
            });
            this.languageSelectTrigger.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.setLanguageSelectOpen(!this.languageSelect.classList.contains('open'));
                } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    this.setLanguageSelectOpen(true);
                    const options = this.languageSelect.querySelectorAll('.custom-select-option');
                    options[event.key === 'ArrowDown' ? 0 : options.length - 1]?.focus();
                } else if (event.key === 'Escape' && this.languageSelect.classList.contains('open')) {
                    event.preventDefault();
                    this.setLanguageSelectOpen(false);
                }
            });
        }

        if (this.languageSelect) {
            this.languageSelect.querySelectorAll('.custom-select-option').forEach((opt, index) => {
                opt.tabIndex = -1;
                opt.addEventListener('keydown', event => {
                    if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
                        event.preventDefault();
                        const options = this.languageSelect.querySelectorAll('.custom-select-option');
                        const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
                            : (index + (event.key === 'ArrowUp' ? -1 : 1) + options.length) % options.length;
                        options[next].focus();
                    } else if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        this.setLanguageSelectOpen(false);
                        this.handleLanguageChange(opt.getAttribute('data-value'));
                        this.languageSelectTrigger.focus();
                    } else if (event.key === 'Escape') {
                        event.preventDefault();
                        this.setLanguageSelectOpen(false);
                        this.languageSelectTrigger.focus();
                    }
                });
                opt.addEventListener('click', () => {
                    const val = opt.getAttribute('data-value');
                    this.setLanguageSelectOpen(false);
                    this.handleLanguageChange(val);
                });
            });
        }

        document.addEventListener('click', (e) => {
            if (this.languageSelect && !this.languageSelect.contains(e.target)) {
                this.setLanguageSelectOpen(false);
            }
        });

        // Apply saved language on load
        this.applyLanguage(RuntimeState.language);

        const settingBtn = document.getElementById('setting-btn');
        if (settingBtn) settingBtn.addEventListener('click', () => this.openSettings());

        // Exit Button Logic
        const exitBtn = document.getElementById('exit-game-btn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                if (window.electronAPI && window.electronAPI.quitGame) {
                    window.electronAPI.quitGame();
                } else {
                    window.close();
                }
            });
        }

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.addEventListener('click', (e) => {
                if (this.dialogueBox && !this.dialogueBox.classList.contains('hidden')) {
                    if (this.choiceBox && !this.choiceBox.classList.contains('hidden') && this.choiceBox.children.length > 0) return;
                    if (e.target.closest('button') || e.target.closest('.menu-btn') || e.target.closest('.choice-btn') || e.target.tagName.toLowerCase() === 'input') return;
                    
                    const validTargets = ['ui-layer', 'background-layer', 'game-container'];
                    if (
                        validTargets.includes(e.target.id) ||
                        e.target.closest('#character-layer') ||
                        e.target.closest('#dialogue-container')
                    ) {
                        this.handleInput();
                    }
                }
            });
        }
    }

    initializeCGGallery() {
        // CG Gallery Bindings
        this.cgModal = document.getElementById('cg-gallery-modal');
        this.cgContent = document.getElementById('cg-gallery-content');
        this.cgClose = document.getElementById('cg-gallery-close');
        this.cgFullView = document.getElementById('cg-full-view');

        if (this.cgClose) this.cgClose.addEventListener('click', () => this.closeCGGallery());
        if (this.cgFullView) {
            this.cgFullView.addEventListener('click', () => {
                this.closeCGFullView();
            });
        }
        document.addEventListener('keydown', (e) => {
            this.handleGameKeydown(e);
        });
    }

    initializeAudioAndDialogueControls() {
        // BGM Init
        this.bgm = document.getElementById('bgm-player');
        if (this.bgm) {
            // Volume Init
            this.currentTrackVolume = 0.5; // Default track volume
            this.bgm.volume = this.currentTrackVolume * RuntimeState.bgmVolume;

            // Explicitly set src on the audio element for reliability
            // (relying on <source> child is unreliable in Electron)
            const menuTrack = GameConfig.bgm[GameConfig.startup.menuBgm];
            if (menuTrack && !this.bgm.src.endsWith(menuTrack)) {
                this.bgm.src = menuTrack;
                this.bgm.load(); // Force the browser to load the new src
            }

            // Note: Autoplay is now handled by Startup Logic to avoid overlap.
            
            // Safety net: if autoplay fails, interacting with main menu will start the BGM
            if (this.mainMenu) {
                this.mainMenu.addEventListener('click', () => {
                    if (this.mainMenu.style.display !== 'none' && this.bgm && this.bgm.paused && menuTrack) {
                        this.bgm.play().catch(e => console.log("BGM autoplay safety net caught:", e));
                    }
                });
            }
        }

        // SE Tracking
        this.activeSoundEffects = [];
        this.initializeVoicePlayer();

        // Force Initial State (Safety Check)
        if (this.mainMenu) this.mainMenu.style.display = 'block';
        if (this.dialogueBox) this.dialogueBox.classList.add('hidden');

        // Auto Play Init
        this.isAutoPlaying = false;
        this.autoBtn = document.getElementById('auto-btn');
        if (this.autoBtn) {
            this.autoBtn.addEventListener('click', (e) => this.toggleAuto(e));
        }

        this.skipBtn = document.getElementById('skip-btn');
        if (this.skipBtn) {
            this.skipBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.skipToNextScene();
            });
        }

        this.dialogueSettingsBtn = document.getElementById('dialogue-settings-btn');
        if (this.dialogueSettingsBtn) {
            this.dialogueSettingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.gameState === GameState.DIALOGUE) this.openSettings();
            });
        }

        this.menuSwBtn = document.getElementById('menu-sw-btn');
        if (this.menuSwBtn) {
            this.menuSwBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showConfirmModal(this.t('returnToTitle'), () => {
                    this.returnToTitle();
                });
            });
        }
        this.autoTimeout = null;

        // History Logic
        this.historyLog = [];
        this.historyBtn = document.getElementById('history-btn');
        this.historyModal = document.getElementById('history-modal');
        this.historyContent = document.getElementById('history-content');
        this.historyClose = document.getElementById('history-close');

        if (this.historyBtn) {
            this.historyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openHistory();
            });
        }
        if (this.historyClose) {
            this.historyClose.addEventListener('click', () => this.closeHistory());
        }
    }

    initializeMessageSystem() {
        // --- Message System Init ---
        this.messageModal = document.getElementById('message-modal');
        this.messageBtn = document.getElementById('message-btn');
        this.messageCloseBtn = document.getElementById('message-close-btn');
        this.messageContactList = document.getElementById('message-contact-list');
        this.messageChatArea = document.getElementById('message-chat-area');
        this.chatHeaderName = document.getElementById('chat-header-name');
        this.chatHeaderStatus = document.getElementById('chat-header-status');
        this.chatHistory = document.getElementById('chat-history');
        this.chatInput = document.getElementById('chat-input');
        this.chatSendBtn = document.getElementById('chat-send-btn');
        this.chatClearBtn = document.getElementById('chat-clear-btn');

        if (this.messageBtn) {
            this.messageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openMessageInterface();
            });
        }
        if (this.messageCloseBtn) {
            this.messageCloseBtn.addEventListener('click', () => this.closeMessageInterface());
        }
        if (this.chatSendBtn) {
            this.chatSendBtn.addEventListener('click', () => this.sendMessage());
        }
        if (this.chatClearBtn) {
            this.chatClearBtn.addEventListener('click', () => this.clearChatHistory());
        }
        if (this.chatInput) {
            this.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.isComposing && !e.repeat) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Initialize Chat Data
        this.initializeChatData();
        this.refreshChatAvailability();
    }

    initializeStartupSequence() {
        this.startupLogoScope?.clear();
        this.finishStartupLogo = null;
        this.startupContainer = document.getElementById('startup-container');
        this.startupVideo = document.getElementById('startup-video');
        if (GameConfig.startup.video && this.startupVideo) this.startupVideo.src = GameConfig.startup.video;
        this.startupLanguageOverlay = document.getElementById('startup-language-overlay');
        this.startupLanguageDialog = document.getElementById('startup-language-dialog');
        this.startupPlayerSpriteToggle = document.getElementById('startup-show-player-sprite');
        this.syncPlayerSpriteSetting();
        this.startupLanguageButtons = Array.from(
            this.startupLanguageOverlay?.querySelectorAll('[data-startup-language]') || []
        );
        // A valid saved preference also preserves language choices made in older versions.
        this.startupLanguageRequired = !['zh', 'ja', 'en'].includes(SaveManager.get('language'));
        this.startupMenuShown = false;
        this.startupNoticeShown = false;
        this.startupNoticeActive = false;
        this.setGameState(GameState.TRANSITION);
        if (this.uiLayer) this.uiLayer.inert = true;

        this.initializeStartupSetup();

        let isIntroPlayed = SaveManager.get('intro_played', false, { session: true });
        if (SaveManager.get('skip_next_intro', false)) {
            isIntroPlayed = true;
            SaveManager.remove('skip_next_intro');
            SaveManager.set('intro_played', true, { session: true });
        }
        this.startupNoticeRequired = !isIntroPlayed || this.startupLanguageRequired;
        if ((this.startupLanguageRequired || this.startupNoticeRequired) && this.startupLanguageOverlay) {
            // Keep a black backdrop behind the logo fade, setup and notice.
            this.startupLanguageOverlay.hidden = false;
        }
        if (!this.startupContainer || !this.startupVideo || isIntroPlayed) {
            this.startupVideo?.pause();
            if (this.startupContainer) this.startupContainer.style.display = 'none';
            this.completeStartup();
            return;
        }

        if (!GameConfig.startup.video) {
            this.startupContainer.style.display = 'none';
            this.completeStartup();
            return;
        }
        const scope = this.startupLogoScope = new ActivityScope();
        const video = this.startupVideo;
        video.muted = true;
        video.loop = false;
        let finished = false;
        let watchdog = null;
        let lastTime = Number(video.currentTime) || 0;
        let lastProgress = performance.now();
        const finishStartup = () => {
            if (finished || scope.closed) return false;
            finished = true;
            this.finishStartupLogo = null;
            clearInterval(watchdog);
            video.onended = null;
            video.onerror = null;
            video.pause();
            this.startupContainer.classList.add('hidden');
            SaveManager.set('intro_played', true, { session: true });
            scope.timeout(() => {
                this.startupContainer.style.display = 'none';
                scope.clear();
                this.completeStartup();
            }, 1000);
            return true;
        };
        this.finishStartupLogo = finishStartup;
        scope.defer(() => {
            clearInterval(watchdog);
            video.onended = null;
            video.onerror = null;
            if (this.startupLogoScope === scope) {
                this.startupLogoScope = null;
                this.finishStartupLogo = null;
            }
        });
        scope.listen(window, 'pagehide', () => scope.clear());
        const checkProgress = () => {
            if (finished || scope.closed || document.hidden) return;
            const now = performance.now();
            const currentTime = Number(video.currentTime) || 0;
            const duration = Number(video.duration);
            if (video.ended || video.error || (Number.isFinite(duration) && duration > 0
                && !video.seeking && currentTime >= duration - 0.05)) {
                finishStartup();
                return;
            }
            if (currentTime > lastTime + 0.01) {
                lastTime = currentTime;
                lastProgress = now;
            } else if (now - lastProgress >= 8000) {
                console.warn('Startup logo stopped progressing; continuing to startup settings.');
                finishStartup();
            }
        };
        scope.listen(video, 'timeupdate', checkProgress);
        scope.listen(document, 'visibilitychange', () => {
            lastProgress = performance.now();
            checkProgress();
        });
        watchdog = setInterval(checkProgress, 250);
        const playLogo = () => {
            try {
                const result = video.play();
                result?.catch(error => {
                    if (scope.closed || finished) return;
                    console.error('Startup video play failed', error);
                    finishStartup();
                });
            } catch (error) {
                console.error('Startup video play failed', error);
                finishStartup();
            }
        };
        video.onended = finishStartup;
        video.onerror = finishStartup;
        scope.listen(this.startupContainer, 'click', () => {
            if (!finished && video.paused) playLogo();
        });

        // Keep studio voices independent of video decoding or playback failures.
        const voices = GameConfig.startup.voices || [];
        const randomVoice = voices[Math.floor(Math.random() * voices.length)];
        try {
            if (!randomVoice) { if (video.ended || video.error) finishStartup(); else playLogo(); return; }
            this.startupVoiceAudio = new Audio(randomVoice);
            this.startupVoiceAudio.volume = RuntimeState.seVolume;
            this.startupVoiceAudio.play()?.catch(error => console.warn('Start voice play failed', error));
        } catch (error) {
            console.warn('Start voice play failed', error);
        }
        if (video.ended || video.error) finishStartup();
        else playLogo();
    }

    completeStartup() {
        if (this.startupNoticeActive || this.startupMenuShown || this.isStartupSetupOpen()) return;
        if (this.startupLanguageRequired && this.startupLanguageDialog) {
            this.showStartupSetup();
            return;
        }
        if (this.startupNoticeRequired && !this.startupNoticeShown) {
            this.startupNoticeShown = true;
            this.showStartupNotice();
            return;
        }
        this.showStartupMenu();
    }

    selectStartupLanguage(language) {
        if (!this.startupLanguageRequired || this.startupLanguageDialog?.hidden) return;
        if (!['zh', 'ja', 'en'].includes(language)) return;
        this.startupSetupDraft.language = language;
        this.renderStartupSetup();
    }

    showStartupMenu() {
        if (this.startupMenuShown) return;
        this.startupMenuShown = true;
        if (this.startupLanguageOverlay) this.startupLanguageOverlay.hidden = true;
        if (this.uiLayer) this.uiLayer.inert = false;
        this.setGameState(GameState.MENU);
        // Focus the menu container without preselecting a button. Tab still
        // reaches the first control, with the themed keyboard focus indicator.
        this.mainMenu?.focus({ preventScroll: true });

        const playMainBgm = () => {
            if (this.bgm && this.bgm.paused && GameConfig.bgm[GameConfig.startup.menuBgm]) {
                this.bgm.play().catch(() => console.log('BGM autoplay prevented (expected).'));
            }
        };
        const voice = this.startupVoiceAudio;
        if (voice && !voice.paused && !voice.ended && !voice.error) {
            voice.onended = playMainBgm;
            voice.onerror = playMainBgm;
        } else {
            playMainBgm();
        }
    }


    beginActivity() {
        this.endActivity();
        this.activityScope = new ActivityScope();
        return this.activityScope;
    }

    endActivity(scope = this.activityScope) {
        if (!scope) return;
        scope.clear();
        if (this.activityScope === scope) this.activityScope = null;
    }

    setGameState(nextState) {
        if (!Object.values(GameState).includes(nextState)) {
            console.warn(`Unknown game state: ${nextState}`);
            return;
        }
        this.gameState = nextState;
        document.body.dataset.gameState = nextState;
    }

    enterOverlay(overlayId) {
        if (!this.stateReturnPoints.has(overlayId)) this.stateReturnPoints.set(overlayId, this.gameState);
        this.setGameState(GameState.MODAL);
        const elements = { settings: 'setting-modal', history: 'history-modal', message: 'message-modal',
            development: 'development-panel-backdrop',
            'load-menu': 'load-menu-modal', 'character-gallery': 'character-gallery-modal',
            'cg-gallery': 'cg-gallery-modal', 'cg-full-view': 'cg-full-view',
            'system-modal': 'system-modal', 'confirm-modal': 'confirm-modal' };
        const element = document.getElementById(elements[overlayId]);
        if (!element?.querySelectorAll) return;
        this.overlayFocusStack ??= [];
        if (this.overlayFocusStack.some(entry => entry.id === overlayId)) return;
        if (!this.overlayFocusStack.length) {
            this.overlayInertState = new Map(Array.from(this.uiLayer.children, child => [child, child.inert]));
        }
        const entry = { id: overlayId, element, returnFocus: document.activeElement };
        this.overlayFocusStack.push(entry);
        this.syncOverlayFocus();
        Promise.resolve().then(() => {
            if (this.overlayFocusStack.at(-1) === entry) this.focusOverlayElement(element);
        });
    }

    leaveOverlay(overlayId, fallbackState = GameState.MENU) {
        const returnState = this.stateReturnPoints.get(overlayId) || fallbackState;
        this.stateReturnPoints.delete(overlayId);
        this.setGameState(returnState);
        const index = this.overlayFocusStack?.findIndex(entry => entry.id === overlayId) ?? -1;
        if (index < 0) return;
        const [entry] = this.overlayFocusStack.splice(index, 1);
        entry.element.inert = true;
        entry.element.setAttribute('aria-hidden', 'true');
        this.syncOverlayFocus();
        const active = this.overlayFocusStack.at(-1);
        if (entry.returnFocus?.isConnected && !entry.returnFocus.closest('[inert], [hidden]')) {
            entry.returnFocus.focus({ preventScroll: true });
        } else if (active) this.focusOverlayElement(active.element);
    }

    syncOverlayFocus() {
        const active = this.overlayFocusStack.at(-1);
        for (const [child, wasInert] of this.overlayInertState || []) {
            child.inert = active ? child !== active.element : wasInert;
        }
        if (active) {
            active.element.inert = false;
            active.element.setAttribute('aria-hidden', 'false');
        } else this.overlayInertState = null;
    }

    overlayFocusableElements(element) {
        return Array.from(element.querySelectorAll('button, input, select, textarea, a[href], [tabindex]'))
            .filter(node => !node.disabled && node.tabIndex >= 0
                && !node.closest('[hidden], [inert]') && node.getClientRects().length);
    }

    focusOverlayElement(element) {
        const target = this.overlayFocusableElements(element)[0] || element;
        if (target === element) element.tabIndex = -1;
        target.focus({ preventScroll: true });
    }

    handleGameKeydown(event) {
        if (event.defaultPrevented || event.isComposing || (event.repeat && event.key !== 'Tab')
            || event.ctrlKey || event.altKey || event.metaKey) return;
        const overlay = this.overlayFocusStack?.at(-1);
        if (overlay) {
            if (event.key === 'Tab') {
                const nodes = this.overlayFocusableElements(overlay.element);
                const index = nodes.indexOf(document.activeElement);
                event.preventDefault();
                if (nodes.length) nodes[(index + (event.shiftKey ? -1 : 1) + nodes.length) % nodes.length].focus();
                else this.focusOverlayElement(overlay.element);
            } else if (event.key === 'Escape' || (overlay.id === 'cg-full-view' && ['Enter', ' '].includes(event.key))) {
                if (this.languageSelect?.classList.contains('open')) {
                    this.setLanguageSelectOpen(false);
                    this.languageSelectTrigger.focus();
                } else {
                    const close = { settings: 'closeSettings', history: 'closeHistory', message: 'closeMessageInterface',
                        development: 'closeDevelopmentPanel',
                        'load-menu': 'closeLoadMenu', 'character-gallery': 'closeCharacterGallery',
                        'cg-gallery': 'closeCGGallery', 'cg-full-view': 'closeCGFullView',
                        'confirm-modal': 'closeConfirmModal' }[overlay.id];
                    if (close) this[close]();
                }
                event.preventDefault();
            }
            return;
        }
        if (event.target?.closest?.('button, input, textarea, select, a, [role="button"], [role="tab"], [role="option"], [contenteditable], .custom-select')) return;
        if (this.gameState === GameState.DIALOGUE && (event.code === 'Space' || event.code === 'Enter')) {
            event.preventDefault();
            this.handleInput();
        }
    }

    toggleAuto(e) {
        if (e) e.stopPropagation();
        if (this.gameState !== GameState.DIALOGUE) return;
        this.isAutoPlaying = !this.isAutoPlaying;
        if (this.autoBtn) {
            this.autoBtn.classList.toggle('active', this.isAutoPlaying);
        }

        if (this.isAutoPlaying && !this.dialogueBox.classList.contains('hidden')) {
            this.maybeScheduleAutoAdvance();
        } else if (!this.isAutoPlaying) {
            if (this.autoTimeout) clearTimeout(this.autoTimeout);
        }
    }

    maybeScheduleAutoAdvance() {
        if (!this.isAutoPlaying || this.isTyping || !this.isTextFinished) return;
        if (!this.isCurrentVoiceFinished()) return;
        if (this.gameState !== GameState.DIALOGUE) return;
        this.triggerAutoNext();
    }

    triggerAutoNext() {
        if (this.autoTimeout) clearTimeout(this.autoTimeout);

        // Fixed 1s delay after text as requested
        const delay = 1000;

        // console.log(`Auto Play waiting for ${delay}ms`);

        const sceneId = this.currentSceneId;
        const commandIndex = this.currentIndex;
        this.autoTimeout = setTimeout(() => {
            const isSameDialogue = sceneId === this.currentSceneId && commandIndex === this.currentIndex;
            if (isSameDialogue && this.isAutoPlaying && this.isTextFinished && this.isCurrentVoiceFinished()
                && !this.choiceBox.classList.contains('visible') && !this.choiceBox.children.length) {
                this.handleInput();
            }
        }, delay);
    }

    // --- New Helper Methods ---
    clearDialogueTimers() {
        for (const key of ['autoTimeout', 'typingLockTimeout']) {
            if (this[key] != null) clearTimeout(this[key]);
            this[key] = null;
        }
        if (this.typingInterval != null) clearInterval(this.typingInterval);
        this.typingInterval = null;
        this.isTyping = false;
        this.isTypingLocked = false;
        this.isTextFinished = false;
    }

    skipToNextScene() {
        if (this.gameState !== GameState.DIALOGUE) return;
        if (!this.currentScene || this.currentIndex >= this.currentScene.length) return;
        if (this.waitHandler) {
            this.waitHandler();
            return;
        }

        this.isAutoPlaying = false;
        this.autoBtn?.classList.remove('active');

        // Interactive commands own their continuation; skipping them can leave
        // the index past the scene end with an empty, unresponsive dialogue box.
        const boundaries = new Set(['jump', 'choice', 'chapter', 'endingCredits',
            'sceneEnd', 'checkFlag', 'minigame', 'fighting', 'dodgeball', 'writing']);
        let nextIndex = this.currentIndex;
        while (nextIndex < this.currentScene.length) {
            const cmd = this.currentScene[nextIndex];
            if (boundaries.has(cmd.type) || (cmd.type === 'cg' && cmd.waitForClick)) {
                break;
            }
            if (cmd.type === 'dialogue') AchievementManager.meet(cmd.speaker);
            if (cmd.type === 'setFlag') RuntimeState.setFlag(cmd.key, cmd.value);
            if (cmd.type === 'unlockGallery') SaveManager.set('gallery_unlocked', true);
            nextIndex++;
        }

        // Malformed/unfinished scenes must not erase the last readable line.
        if (nextIndex >= this.currentScene.length) {
            if (this.autoTimeout != null) clearTimeout(this.autoTimeout);
            this.autoTimeout = null;
            if (this.isTyping) this.finishTyping();
            return;
        }

        this.stopVoice({ scheduleAuto: false });
        this.stopAllSoundEffects?.();
        this.clearDialogueTimers();
        this.currentIndex = nextIndex;
        // Clean up UI instantly to prevent ghost text
        this.nameBox.innerText = "";
        this.textBox.innerHTML = "";

        // Execute the command we landed on
        this.processCommand();
    }

    switchMainMenuBg() {
        this.mainMenuIndex = MainMenuBackground.next(this.mainMenuIndex);
        this.updateMainMenuBg();
    }

    updateMainMenuBg() {
        return this.mainMenuBackground?.request(this.mainMenuIndex);
    }

    initializeFeatureVisibility() {
        for (const [id, enabled] of [['message-btn', GameConfig.features.chat], ['cg-btn', GameConfig.features.cgGallery], ['characters-btn', GameConfig.features.characterGallery], ['settings-tab-achievements', GameConfig.features.achievements]]) {
            const element = document.getElementById(id);
            if (element) element.hidden = !enabled;
        }
        document.documentElement.dataset.framework = 'true';
    }

    getChapterList(language = RuntimeState.language) {
        return GameConfig.chapters.map(chapter => ({ ...chapter,
            title: GameConfig.languages[language]?.chapterTitles?.[chapter.id] || chapter[language] || chapter.zh || chapter.id
        }));
    }

    normalizeChapterTitle(title) {
        return String(title || '').replace(/[\s:：、，。,.!?！？“”‘’"'「」『』【】（）()\-—_]/g, '');
    }

    getChapterUnlockId(value) {
        const chapters = this.getChapterList();
        const normalizedValue = this.normalizeChapterTitle(value);
        const chapter = chapters.find(item => (
            item.id === value
            || this.normalizeChapterTitle(GameConfig.languages.en?.chapterTitles?.[item.id]) === normalizedValue
            || this.normalizeChapterTitle(item.zh) === normalizedValue
            || this.normalizeChapterTitle(item.ja) === normalizedValue
        ));
        return chapter ? chapter.id : value;
    }

    handleTitleClick() {
        if (this.developmentMode !== true) return;
        this.titleClickCount++;
        // console.log("Title Click:", this.titleClickCount);
        if (this.titleClickCount >= 3) {
            AchievementManager.suspendForDebug();
            this.titleClickCount = 0;

            // 1. Unlock All Chapters
            const allChapters = this.getChapterList().map(c => c.id);
            RuntimeState.setUnlocked('chapters', allChapters);

            // 2. Unlock All CGs
            if (typeof GameConfig !== 'undefined' && GameConfig.cgs) {
                const allCGs = Object.keys(GameConfig.cgs);
                RuntimeState.setUnlocked('cgs', allCGs);
            }

            // 3. Unlock All Characters
            if (typeof GameConfig !== 'undefined' && GameConfig.characters) {
                const allChars = Object.keys(GameConfig.characters);
                RuntimeState.setUnlocked('chars', allChars);
            }

            // 4. Ensure Gallery Feature is Unlocked
            SaveManager.set('gallery_unlocked', true);

            this.showSystemModal(this.t('debugUnlock'));
        }
    }

    startGame() {
        this.setGameState(GameState.DIALOGUE);
        // 1. Reset UI Levels
        this.mainMenu.style.display = 'none';

        // 2. Ensure Dialogue is hidden initially
        this.dialogueBox.classList.add('hidden');
        this.nameBox.innerText = "";
        this.textBox.innerText = "";

        // 3. Reset Background Layer
        // We want the body background (black) to show, or a specific black image.
        // Let's reset opacity to 1 and ensure it's black.
        this.bgLayer.style.backgroundImage = 'none';
        this.bgLayer.style.backgroundColor = 'black';
        this.bgLayer.style.opacity = 1;

        // 4. Reset Title
        this.chapterTitle.classList.add('hidden');
        this.chapterTitle.innerText = "";

        // 5. Start Scene
        this.historyLog = []; // Reset history on new game
        this.loadScene(GameConfig.project.startScene);
    }

    async loadScene(sceneId) {
        const loadToken = ++this.sceneLoadToken;
        const sceneLanguage = RuntimeState.language;
        // Lock input before awaiting a lazy-loaded chapter, including jump/choice
        // exits, so a second click cannot consume the old scene's boundary.
        this.setGameState(GameState.TRANSITION);
        this.stopVoice({ scheduleAuto: false });
        this.clearDialogueTimers();
        if (this.waitHandler) {
            document.body.removeEventListener('click', this.waitHandler);
            this.waitHandler = null;
        }
        if (this.storyWaitTimer) {
            clearTimeout(this.storyWaitTimer);
            this.storyWaitTimer = null;
        }

        try {
            if (sceneLanguage === 'en' && !StoryRepository.getManifest('en')[sceneId]) {
                this.isAutoPlaying = false;
                this.autoBtn?.classList.remove('active');
                if (this.autoTimeout) clearTimeout(this.autoTimeout);
                this.showSystemModal(this.t('translationBoundary'), () => this.returnToTitle());
                return;
            }
            const scene = await StoryRepository.getScene(sceneLanguage, sceneId);
            if (loadToken !== this.sceneLoadToken) return;

            if (!scene) {
                console.error(`Scene ${sceneId} not found!`);
                this.setGameState(GameState.DIALOGUE);
                this.showSystemModal(this.t('sceneNotFound', sceneId));
                return;
            }

            this.currentScene = scene;
            this.currentSceneId = sceneId;
            this.currentSceneLanguage = sceneLanguage;
            this.currentIndex = 0;
            this.setGameState(GameState.DIALOGUE);
            this.processCommand();
        } catch (error) {
            if (loadToken !== this.sceneLoadToken) return;
            console.error(error);
            this.setGameState(GameState.DIALOGUE);
            this.showSystemModal(this.t('sceneNotFound', sceneId));
        }
    }

    handleInput() {
        if (this.gameState !== GameState.DIALOGUE) return;
        // Block input during dodgeball or writing minigame
        if (this.isDodgeballActive || this.isWritingActive) return;

        // Clear collision with auto
        if (this.autoTimeout) clearTimeout(this.autoTimeout);

        if (this.waitHandler) {
            this.waitHandler();
            return;
        }

        // Debounce check: Prevent accidental skip immediately after text start
        if (this.isTypingLocked) return;

        if (this.isTyping) {
            this.finishTyping();
        } else {
            this.stopVoice({ scheduleAuto: false });
            this.currentIndex++;
            this.processCommand();
        }
    }

    processCommand() {
        if (!this.currentScene || this.currentIndex >= this.currentScene.length) return;

        const command = this.currentScene[this.currentIndex];

        try {
            const handler = CommandHandlers[command.type] || CommandHandlers.unknown;
            handler(this, command);
        } catch (error) {
            console.error(error);
            this.showSystemModal("Error: " + error.message);
        }
    }

    advanceCommand() {
        this.currentIndex++;
        this.processCommand();
    }

    waitForCommand(duration) {
        const delay = Math.max(0, Number(duration) || 0);
        this.setGameState(GameState.TRANSITION);
        this.storyWaitTimer = setTimeout(() => {
            this.storyWaitTimer = null;
            this.setGameState(GameState.DIALOGUE);
            this.advanceCommand();
        }, delay);
    }

    playEffect(effectName, callback) {
        if (effectName === 'closeEye') {
            const gameContainer = document.getElementById('game-container');
            const uiLayer = document.getElementById('ui-layer');

            // --- Create the SVG overlay with mask-based eye cutout ---
            const svgNS = 'http://www.w3.org/2000/svg';
            const overlay = document.createElement('div');
            overlay.className = 'eye-close-overlay';
            overlay.style.cssText = `
                z-index: 9998; pointer-events: none;
            `;

            const svg = document.createElementNS(svgNS, 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('viewBox', '0 0 1920 1080');
            svg.setAttribute('preserveAspectRatio', 'none');
            svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';

            const defs = document.createElementNS(svgNS, 'defs');

            // Mask: white = overlay visible (black), black = overlay hidden (content shows through)
            const mask = document.createElementNS(svgNS, 'mask');
            mask.setAttribute('id', 'eyeCloseMask');

            // White rect covers everything — makes the black overlay visible everywhere
            const maskRect = document.createElementNS(svgNS, 'rect');
            maskRect.setAttribute('x', '-100');
            maskRect.setAttribute('y', '-100');
            maskRect.setAttribute('width', '2120');
            maskRect.setAttribute('height', '1280');
            maskRect.setAttribute('fill', 'white');
            mask.appendChild(maskRect);

            // Eye-shaped cutout (black in mask = transparent in overlay = content visible)
            const eyeCutout = document.createElementNS(svgNS, 'path');
            eyeCutout.setAttribute('fill', 'black');
            mask.appendChild(eyeCutout);

            // Soft edge for the eye cutout (slightly larger, gray, creates feathered edge)
            const eyeSoftEdge = document.createElementNS(svgNS, 'path');
            eyeSoftEdge.setAttribute('fill', 'rgba(0,0,0,0.3)');
            mask.appendChild(eyeSoftEdge);

            defs.appendChild(mask);

            // Blur filter for eyelash shadow line
            const blurFilter = document.createElementNS(svgNS, 'filter');
            blurFilter.setAttribute('id', 'eyeLashBlur');
            const feBlur = document.createElementNS(svgNS, 'feGaussianBlur');
            feBlur.setAttribute('stdDeviation', '6');
            blurFilter.appendChild(feBlur);
            defs.appendChild(blurFilter);

            svg.appendChild(defs);

            // Black rectangle covering entire screen, masked by the eye shape
            const blackRect = document.createElementNS(svgNS, 'rect');
            blackRect.setAttribute('x', '-100');
            blackRect.setAttribute('y', '-100');
            blackRect.setAttribute('width', '2120');
            blackRect.setAttribute('height', '1280');
            blackRect.setAttribute('fill', 'black');
            blackRect.setAttribute('mask', 'url(#eyeCloseMask)');
            svg.appendChild(blackRect);

            // Eyelash shadow lines (drawn on top of the masked overlay)
            const upperLash = document.createElementNS(svgNS, 'path');
            upperLash.setAttribute('fill', 'none');
            upperLash.setAttribute('stroke', 'rgba(0,0,0,0.7)');
            upperLash.setAttribute('stroke-width', '5');
            upperLash.setAttribute('filter', 'url(#eyeLashBlur)');
            svg.appendChild(upperLash);

            const lowerLash = document.createElementNS(svgNS, 'path');
            lowerLash.setAttribute('fill', 'none');
            lowerLash.setAttribute('stroke', 'rgba(0,0,0,0.4)');
            lowerLash.setAttribute('stroke-width', '3');
            lowerLash.setAttribute('filter', 'url(#eyeLashBlur)');
            svg.appendChild(lowerLash);

            overlay.appendChild(svg);
            gameContainer.insertBefore(overlay, uiLayer);

            // --- Animation parameters ---
            const duration = 2800;  // ms — slightly longer for a more natural feel
            const startTime = performance.now();
            const cx = 960, cy = 540; // center of 1920x1080

            // Easing: ease-in-out cubic
            const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            // Apply progressive blur to game content
            const bgLayer = document.getElementById('background-layer');
            const charLayer = document.getElementById('character-layer');
            const dialogueContainer = document.getElementById('dialogue-container');

            // Eye shape geometry:
            // The "eye" is a lens/vesica piscis shape — pointed at left and right, curved top and bottom
            // We animate the top and bottom curves converging toward the center horizontal line (cy=540)
            const leftX = -300;        // left point of the eye (past screen edge)
            const rightX = 2220;       // right point of the eye (past screen edge)
            const topStart = -80;      // initial top curve Y (just above screen = visible immediately)
            const bottomStart = 1160;  // initial bottom curve Y (just below screen)

            // Helper: build an eye-shaped SVG path from left to right
            // Uses cubic bezier curves to create a natural lens shape
            const buildEyePath = (topY, bottomY) => {
                // Upper lid: from left point → curves up to topY at center → right point
                // Lower lid: from right point → curves down to bottomY at center → left point
                const cpOffset = (rightX - leftX) * 0.28; // control point horizontal offset
                return `M ${leftX} ${cy} ` +
                    `C ${leftX + cpOffset} ${topY}, ${rightX - cpOffset} ${topY}, ${rightX} ${cy} ` +
                    `C ${rightX - cpOffset} ${bottomY}, ${leftX + cpOffset} ${bottomY}, ${leftX} ${cy} Z`;
            };

            const animate = (now) => {
                const elapsed = now - startTime;
                const rawT = Math.min(elapsed / duration, 1);
                const t = ease(rawT);

                // Interpolate top and bottom toward center (cy = 540)
                const topY = topStart + (cy - topStart) * t;       // -80 → 540
                const bottomY = bottomStart + (cy - bottomStart) * t; // 1160 → 540

                // Main eye cutout
                eyeCutout.setAttribute('d', buildEyePath(topY, bottomY));

                // Soft edge (slightly larger opening for feathered edge effect)
                const softMargin = 25 * (1 - t); // shrinks as eye closes
                eyeSoftEdge.setAttribute('d', buildEyePath(topY - softMargin, bottomY + softMargin));

                // Eyelash shadow lines along the eyelid edges
                const cpOffset = (rightX - leftX) * 0.28;
                const upperLashD = `M ${leftX} ${cy} C ${leftX + cpOffset} ${topY}, ${rightX - cpOffset} ${topY}, ${rightX} ${cy}`;
                upperLash.setAttribute('d', upperLashD);
                upperLash.setAttribute('stroke-opacity', Math.min(1, t * 2)); // fade in

                const lowerLashD = `M ${leftX} ${cy} C ${leftX + cpOffset} ${bottomY}, ${rightX - cpOffset} ${bottomY}, ${rightX} ${cy}`;
                lowerLash.setAttribute('d', lowerLashD);
                lowerLash.setAttribute('stroke-opacity', Math.min(1, t * 2));

                // --- Subtle blur only in the final phase of closing ---
                // Keep content sharp while the eye shape does the work
                if (t > 0.8) {
                    const blurT = (t - 0.8) / 0.2; // 0→1 in the last 20%
                    const blurAmount = blurT * 6;
                    const brightnessAmount = 1 - blurT * 0.3;
                    const filterStr = `blur(${blurAmount}px) brightness(${brightnessAmount})`;
                    if (bgLayer) bgLayer.style.filter = filterStr;
                    if (charLayer) charLayer.style.filter = filterStr;
                    if (dialogueContainer) dialogueContainer.style.filter = filterStr;
                }

                if (rawT < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Animation complete:
                    // 1. Remove the overlay (it's a sibling of ui-layer, so it blocks the modal)
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    // 2. Set background layer to solid black so screen stays dark
                    if (bgLayer) {
                        bgLayer.style.backgroundImage = 'none';
                        bgLayer.style.backgroundColor = 'black';
                        bgLayer.style.filter = '';
                    }
                    // 3. Hide character and dialogue layers, clear their filters
                    if (charLayer) { charLayer.style.filter = ''; charLayer.style.opacity = '0'; }
                    if (dialogueContainer) { dialogueContainer.style.filter = ''; dialogueContainer.classList.add('hidden'); }

                    // Hold on black screen for a moment, then trigger callback (sceneEnd modal)
                    setTimeout(() => {
                        if (callback) callback();
                    }, 1000);
                }
            };

            // Force reflow then start
            void overlay.offsetWidth;
            requestAnimationFrame(animate);
        } else {
            console.warn("Unknown effect:", effectName);
            if (callback) callback();
        }
    }





    createBackgroundTransition(transition) {
        const overlay = document.createElement('div');
        overlay.className = 'background-transition';
        const oldImage = this.bgLayer.style.backgroundImage;
        if (oldImage && oldImage !== 'none') {
            overlay.style.backgroundImage = oldImage;
        } else {
            overlay.style.backgroundColor = this.bgLayer.style.backgroundColor || 'black';
        }
        overlay.style.transition = `opacity ${transition}`;
        overlay.style.opacity = '1';
        document.getElementById('game-container').insertBefore(overlay, this.charLayer);
        return overlay;
    }

    showCG(assetKey, onComplete, waitForClick = false) {
        this.setGameState(GameState.TRANSITION);
        // Stop SEs
        this.stopAllSoundEffects();
        this.stopVoice({ scheduleAuto: false });

        const url = GameConfig.cgs[assetKey];
        if (!url) {
            console.error("CG not found: " + assetKey);
            this.setGameState(GameState.DIALOGUE);
            if (onComplete) onComplete();
            return;
        }

        this.unlockCG(assetKey);

        // 1. Hide UI
        this.dialogueBox.classList.add('hidden');
        this.charLayer.classList.add('hidden');
        this.charLayer.innerHTML = ''; // Clear chars immediately

        // Preload image
        const img = new Image();
        img.src = url;
        img.onload = () => {
            // 2. Prepare Crossfade Overlay
            const overlay = this.createBackgroundTransition('1.5s ease-in-out');

            // 3. Set New CG as Background
            this.bgLayer.style.backgroundImage = `url('${url}')`;
            this.bgLayer.style.opacity = '1';

            // Force reflow
            void overlay.offsetWidth;

            // 4. Fade out overlay
            overlay.style.opacity = '0';

            // 5. Cleanup and Finish
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }

                this.charLayer.innerHTML = ''; // Clear chars during transition

                // Internal finish function
                let isFinished = false;
                const finishCG = () => {
                    if (isFinished) return;
                    isFinished = true;
                    if (this.waitHandler) {
                        document.body.removeEventListener('click', this.waitHandler);
                        this.waitHandler = null;
                    }
                    this.dialogueBox.classList.remove('hidden');
                    // Characters remain hidden until script shows them
                    this.charLayer.classList.remove('hidden');
                    this.setGameState(GameState.DIALOGUE);
                    if (onComplete) onComplete();
                };

                if (waitForClick) {
                    this.waitHandler = finishCG;
                    // Allow clicking to proceed after fade is done
                    document.body.addEventListener('click', finishCG, { once: true });
                } else {
                    setTimeout(finishCG, 1000); // Wait a bit more then proceed automatically
                }

            }, 1500); // Match transition duration
        };

        img.onerror = () => {
            console.error("Failed to load CG: " + url);
            this.dialogueBox.classList.remove('hidden');
            this.charLayer.classList.remove('hidden');
            this.setGameState(GameState.DIALOGUE);
            if (onComplete) onComplete();
        };
    }




    // --- Load Menu Logic ---









    // --- Settings Menu Logic ---






    // --- Language Switching Logic ---


    // --- Translation Helper ---



    // --- History Logic ---


    // --- Character Gallery ---









    // --- Generic System Modal ---


    // --- Confirm Modal Logic ---


    showChapterTransition(titleText, onComplete) {
        this.setGameState(GameState.TRANSITION);
        // RECORD UNLOCK PROGRESS
        RuntimeState.unlock('chapters', this.getChapterUnlockId(titleText));

        // Stop SEs
        this.stopAllSoundEffects();
        this.stopVoice({ scheduleAuto: false });

        // 1. Hide UI
        this.dialogueBox.classList.add('hidden');
        this.charLayer.classList.add('hidden');

        // 2. Prepare Crossfade to Black
        const oldBgUrl = this.bgLayer.style.backgroundImage;
        const oldBgColor = this.bgLayer.style.backgroundColor;

        // Only perform crossfade if there's something visible to fade from
        if ((oldBgUrl && oldBgUrl !== 'none') || (this.bgLayer.style.opacity > 0 && oldBgColor)) {
            const overlay = this.createBackgroundTransition('1s ease');

            // Set background to black immediately behind overlay
            this.bgLayer.style.backgroundImage = 'none';
            this.bgLayer.style.backgroundColor = 'black';
            this.bgLayer.style.opacity = 1;

            // Force reflow
            void overlay.offsetWidth;

            // Fade out overlay (reveal black)
            overlay.style.opacity = '0';

            // Cleanup overlay after transition
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 1000);
        } else {
            // Instant black if nothing to fade from (e.g. very first load)
            this.bgLayer.style.backgroundImage = 'none';
            this.bgLayer.style.backgroundColor = 'black';
            this.bgLayer.style.opacity = 1;
        }

        setTimeout(() => {
            // 3. Show Title
            this.chapterTitle.innerText = titleText;
            this.chapterTitle.classList.remove('hidden');

            // 4. Wait reading time
            setTimeout(() => {
                // 5. Hide Title
                this.chapterTitle.classList.add('hidden');

                // 6. Proceed
                setTimeout(() => {
                    this.setGameState(GameState.DIALOGUE);
                    if (onComplete) onComplete();
                }, 1000); // Allow title to fade out completely
            }, 3000); // Display duration
        }, 500); // Start title fade in slightly into the black fade
    }

    changeBackground(assetKey, onComplete) {
        this.setGameState(GameState.TRANSITION);
        const url = GameConfig.backgrounds[assetKey];
        if (url && (url.startsWith('#') || /^(?:linear|radial)-gradient\(/.test(url))) {
            this.bgLayer.style.background = url;
            this.bgLayer.style.opacity = '1';
            this.charLayer.replaceChildren();
            this.charLayer.classList.remove('hidden');
            this.dialogueBox.classList.remove('hidden');
            this.setGameState(GameState.DIALOGUE);
            if (onComplete) onComplete();
            return;
        }
        if (!url) {
            this.setGameState(GameState.DIALOGUE);
            if (onComplete) onComplete();
            return;
        }

        // 1. Hide UI
        this.dialogueBox.classList.add('hidden');
        this.charLayer.classList.add('hidden'); // Fade out chars

        // Preload image to avoid white flash
        const img = new Image();
        img.src = url;
        img.onload = () => {
            // 2. Prepare Crossfade Overlay (Old BG)
            const overlay = this.createBackgroundTransition('1s ease');

            // 3. Set New BG immediately behind overlay
            this.bgLayer.style.backgroundImage = `url('${url}')`;
            this.bgLayer.style.opacity = '1'; // Ensure BG layer is visible

            // 4. Force browser reflow to ensure transition works
            void overlay.offsetWidth;

            // 5. Fade out overlay
            overlay.style.opacity = '0';

            // 6. Clear characters
            setTimeout(() => {
                this.charLayer.innerHTML = '';
                this.charLayer.classList.remove('hidden'); // Reset opacity for next chars
            }, 500);

            // 7. Cleanup after transition
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }

                // 8. Restore UI and proceed
                this.dialogueBox.classList.remove('hidden');
                this.setGameState(GameState.DIALOGUE);
                if (onComplete) onComplete();
            }, 1000); // 1s matches transition time
        };

        img.onerror = () => {
            console.error("Failed to load background: " + url);
            this.dialogueBox.classList.remove('hidden');
            this.charLayer.classList.remove('hidden');
            this.setGameState(GameState.DIALOGUE);
            if (onComplete) onComplete();
        };
    }

    updateCharacterExpression(id, expression) {
        const charImg = document.getElementById(`char-${id}`);
        const charData = GameConfig.characters[id];
        if (charImg && charData && charData.sprites && charData.sprites[expression]) {
            charImg.src = charData.sprites[expression];
            charImg.dataset.expression = expression;
        }
    }

    syncPlayerSpriteVisibility() {
        // Keep the scripted sprite state intact so toggling back on restores the
        // current expression/position, including the protagonist's yukata variant.
        this.charLayer?.querySelectorAll('.character-sprite').forEach(sprite => {
            const id = sprite.id.slice('char-'.length);
            const isPlayer = id === GameConfig.project.protagonist || GameConfig.characters[id]?.baseCharacter === GameConfig.project.protagonist;
            sprite.hidden = isPlayer && RuntimeState.showPlayerSprite === false;
        });
    }

    showCharacter(cmd) {
        // UNLOCK CHARACTER: Whenever a character is shown, unlock them
        this.unlockCharacter(cmd.id);

        const targetPosClass = `pos-${cmd.position || 'center'}`;

        // 1. Check for collision at target position
        // If another character is already at this position, remove them to prevent stacking
        const existingSprites = document.querySelectorAll('.character-sprite');
        existingSprites.forEach(sprite => {
            if (sprite.id !== `char-${cmd.id}` && sprite.classList.contains(targetPosClass)) {
                // Fade out and remove
                sprite.classList.remove('visible');
                setTimeout(() => sprite.remove(), 500);
            }
        });

        // 1.5. Global Limit Check (Max 3)
        // If adding a new character would exceed 3, remove the oldest one.
        const charExists = document.getElementById(`char-${cmd.id}`);
        const isVisible = charExists && charExists.classList.contains('visible');

        if (!isVisible) {
            const visibleChars = Array.from(document.querySelectorAll('.character-sprite'))
                .filter(el => el.classList.contains('visible'));
            if (visibleChars.length >= 3) {
                const oldest = visibleChars[0]; // First in list is oldest in DOM (FIFO)
                oldest.classList.remove('visible');
                setTimeout(() => oldest.remove(), 500);
            }
        }

        // 2. Create or Get visible character
        let charImg = document.getElementById(`char-${cmd.id}`);
        const charData = GameConfig.characters[cmd.id];
        if (!charData) {
            console.error(`Character data for ${cmd.id} not found.`);
            return;
        }

        const sprites = charData.sprites || {};
        let spriteUrl = sprites[cmd.expression];
        if (!spriteUrl) spriteUrl = sprites.default || sprites.normal;

        if (!charImg) {
            charImg = document.createElement(spriteUrl ? 'img' : 'div');
            charImg.id = `char-${cmd.id}`;
            charImg.className = 'character-sprite';
            this.charLayer.appendChild(charImg);
        } else {
            // Cancel pending removal
            if (charImg.dataset.removeTimer) {
                clearTimeout(parseInt(charImg.dataset.removeTimer));
                delete charImg.dataset.removeTimer;
            }
        }

        if (spriteUrl) {
            charImg.src = spriteUrl;
        } else {
            charImg.classList.add('character-placeholder');
            charImg.textContent = this.characterName(cmd.id);
            charImg.style.setProperty('--character-color', charData.color || '#617487');
        }

        // Remove old positions
        charImg.classList.remove('pos-left', 'pos-center', 'pos-right');

        // Add new position
        charImg.classList.add(targetPosClass);

        setTimeout(() => charImg.classList.add('visible'), 50);

        // 3. Update Focus immediately
        // remove 'dimmed' from the new char.
        charImg.classList.remove('dimmed');
        charImg.style.zIndex = 20; // Default to front when entering

        // Store current expression for state toggling
        charImg.dataset.expression = cmd.expression || 'default';
        this.syncPlayerSpriteVisibility();
    }

    focusCharacter(speakerId) {
        const sprites = document.querySelectorAll('.character-sprite');
        // If speakerId is null or system, maybe dim all or keep as is? 
        // Let's assume we keep as is if no speaker, or user wants to see reactions.
        // But the user request is "Speaking one to top".

        // Find if the speaker is actually on stage
        const speakerSprite = document.getElementById(`char-${speakerId}`);

        if (speakerSprite) {
            sprites.forEach(sprite => {
                if (sprite.id === `char-${speakerId}`) {
                    sprite.classList.remove('dimmed');
                    sprite.style.zIndex = 30; // Bring to absolute front
                    sprite.style.filter = "brightness(1)"; // Ensure full brightness
                } else {
                    sprite.classList.add('dimmed');
                    sprite.style.zIndex = 10; // Send to back
                    // Filter handled by CSS .dimmed
                }
            });
        }
    }

    hideCharacter(id) {
        if (id === 'all') {
            const sprites = document.querySelectorAll('.character-sprite');
            sprites.forEach(sprite => {
                sprite.classList.remove('visible');
                // Store timer to allow cancellation
                if (sprite.dataset.removeTimer) clearTimeout(parseInt(sprite.dataset.removeTimer));
                const timer = setTimeout(() => sprite.remove(), 500);
                sprite.dataset.removeTimer = timer;
            });
        } else {
            const charImg = document.getElementById(`char-${id}`);
            if (charImg) {
                charImg.classList.remove('visible');
                if (charImg.dataset.removeTimer) clearTimeout(parseInt(charImg.dataset.removeTimer));
                const timer = setTimeout(() => charImg.remove(), 500); // Remove after transition
                charImg.dataset.removeTimer = timer;
            }
        }
    }

    showDialogue(cmd) {
        this.setGameState(GameState.DIALOGUE);
        // Silent effect trigger for pure system shake commands
        if (cmd.shake === true || (cmd.text && cmd.text.trim() === "（系统：画面震动）")) {
            const container = document.getElementById('game-container');
            container.classList.add('shake-active');
            setTimeout(() => {
                container.classList.remove('shake-active');
            }, 500);
            this.currentIndex++;
            this.processCommand();
            return;
        }

        // Ensure dialogue box is visible
        this.dialogueBox.classList.remove('hidden');

        const charData = GameConfig.characters[cmd.speaker];

        // Set Name
        if (charData) {
            this.nameBox.innerText = this.dialogueSpeakerName(cmd.speaker);
            let color = charData.color || "#333";
            if (color.includes(',')) color = color.split(',')[0].trim();
            this.nameBox.style.color = color;
        } else {
            this.nameBox.innerText = "";
        }

        this.isTextFinished = false;
        const voiceEntry = this.playVoiceForDialogue(this.currentSceneId, this.currentIndex, cmd.speaker);

        // Add to History
        this.historyLog.push({
            speaker: cmd.speaker,
            text: cmd.text,
            sceneId: this.currentSceneId,
            commandIndex: this.currentIndex,
            language: this.currentSceneLanguage,
            voiceId: voiceEntry ? voiceEntry.id : null,
            voiceSrc: voiceEntry ? voiceEntry.src : null
        });

        console.log("Playing Dialogue:", cmd.speaker, cmd.text);

        // Check for Screen Shake trigger in text
        if (cmd.text.includes("画面震动")) {
            const container = document.getElementById('game-container');
            container.classList.add('shake-active');
            setTimeout(() => {
                container.classList.remove('shake-active');
            }, 500);
        }

        // Typewriter effect
        // Reset text box style to ensure visibility
        this.textBox.style.opacity = 1;
        this.textBox.style.color = "#444"; // Enforce color

        this.currentSpeaker = cmd.speaker;

        // Apply explicit expression if provided
        if (cmd.expression) {
            this.updateCharacterExpression(cmd.speaker, cmd.expression);
        }

        this.toggleTalkingState(cmd.speaker, true);

        this.focusCharacter(cmd.speaker);
        this.typeText(cmd.text);
    }

    typeText(text) {
        if (this.typingInterval) clearInterval(this.typingInterval);
        if (this.typingLockTimeout != null) clearTimeout(this.typingLockTimeout);

        this.isTyping = true;
        this.isTextFinished = false;

        // Lock input briefly to prevent instant-skip on double click
        this.isTypingLocked = true;
        this.typingLockTimeout = setTimeout(() => {
            this.typingLockTimeout = null;
            this.isTypingLocked = false;
        }, 200);

        this.textBox.innerText = "";
        this.currentFullText = text;
        let i = 0;

        this.typingInterval = setInterval(() => {
            this.textBox.innerText += text.charAt(i);
            i++;
            if (i >= text.length) {
                this.finishTyping();
            }
        }, GameConfig.textSpeed);
    }

    finishTyping() {
        clearInterval(this.typingInterval);
        this.typingInterval = null;
        this.textBox.innerText = this.currentFullText;
        this.isTyping = false;
        this.isTextFinished = true;
        this.maybeScheduleAutoAdvance();
    }

    toggleTalkingState(charId, isTalking) {
        if (!charId || charId === 'system') return;

        const img = document.getElementById(`char-${charId}`);
        if (!img) return;

        const charData = GameConfig.characters[charId];
        if (!charData) return;

        let currentExp = img.dataset.expression;
        let targetExp = null;

        if (isTalking) {
            // If current expression is ANY yukata variant, switch to yukata_talk
            if (currentExp && currentExp.includes('yukata')) {
                // Keep existing emotion if it's not a generic normal state?
                // Actually, simply force talk if it's normal-ish.
                if (currentExp.includes('normal') || currentExp.includes('default')) {
                    targetExp = 'yukata_talk';
                }
            } else if (currentExp === 'normal' || currentExp === 'default') {
                targetExp = 'talk';
            }
        } else {
            // Stop talking
            if (currentExp === 'yukata_talk') {
                targetExp = 'yukata_normal';
            } else if (currentExp === 'talk') {
                targetExp = 'normal';
            }
        }

        // Validate targetExp and fallback
        if (targetExp === 'normal' && !charData.sprites['normal']) {
            targetExp = 'default';
        }
        if (targetExp === 'yukata_normal' && !charData.sprites['yukata_normal']) {
            // Fallback for yukata might be specific, but lets assume it exists or fallback to default if desperate
            if (charData.sprites['yukata_default']) targetExp = 'yukata_default';
        }

        if (targetExp && targetExp !== currentExp && charData.sprites[targetExp]) {
            img.src = charData.sprites[targetExp];
            img.dataset.expression = targetExp;
        }
    }

    resetNonSpeakers(activeSpeakerId) {
        const sprites = document.querySelectorAll('.character-sprite');
        sprites.forEach(sprite => {
            const id = sprite.id.replace('char-', '');
            // Skip the current speaker
            if (id === activeSpeakerId) return;

            const charData = GameConfig.characters[id];
            if (!charData) return;

            const currentExp = sprite.dataset.expression;
            let targetExp = 'normal';

            // Preserve Yukata context
            if (currentExp && currentExp.includes('yukata')) {
                targetExp = 'yukata_normal';
            }

            // Fallback for normal/yukata_normal if key missing
            if (targetExp === 'normal' && !charData.sprites['normal']) {
                targetExp = 'default';
            }
            // If they are in yukata but yukata_normal missing, we might have an issue, 
            // but usually config has normal/default logic. 
            // Only overwrite if we have a valid sprite for the target
            if (charData.sprites[targetExp]) {
                // Only change if different to avoid flickering (though src check usually handles it)
                // Note: 'default' and 'normal' might point to same URL, checking ID is safer
                if (currentExp !== targetExp) {
                    sprite.src = charData.sprites[targetExp];
                    sprite.dataset.expression = targetExp;
                    sprite.classList.add('dimmed'); // Ensure dimmed
                    sprite.style.zIndex = 10;
                }
            }
        });
    }

    showChoices(options) {
        this.setGameState(GameState.CHOICE);
        this.choiceBox.innerHTML = "";
        this.choiceBox.classList.remove('hidden');
        this.dialogueBox.classList.add('hidden'); // Hide dialogue during choice? Optional.

        options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'choice-btn';
            btn.innerText = opt.text;
            btn.onclick = () => {
                this.choiceBox.classList.add('hidden');
                this.choiceBox.innerHTML = ''; // Clear choices so Auto knows we are done
                this.dialogueBox.classList.remove('hidden');
                this.loadScene(opt.target);
            };
            btn.addEventListener('keydown', event => {
                if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const buttons = this.choiceBox.querySelectorAll('button');
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
                    : (index + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length;
                buttons[next].focus();
            });
            this.choiceBox.appendChild(btn);
        });
        this.choiceBox.querySelector('button')?.focus({ preventScroll: true });
    }

}

Object.assign(
    GameEngine.prototype,
    AudioManagerMethods,
    LocalizationMethods,
    GalleryMethods,
    LoadMenuMethods,
    SettingsMethods,
    HistoryMethods,
    ModalMethods,
    MessageInterfaceMethods,
    EndingCreditsMethods,
    RhythmGameMethods,
    FightingGameMethods,
    DodgeballGameMethods,
    WritingGameMethods
);

// Initialize
window.onload = () => {
    const game = new GameEngine();
    window.game = game; // Useful for debugging your own story.
};
