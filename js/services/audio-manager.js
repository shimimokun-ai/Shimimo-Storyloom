const AudioManagerMethods = {
    initializeVoicePlayer() {
        this.voiceAudio = new Audio();
        this.voiceAudio.preload = 'auto';
        this.currentVoiceEntry = null;
        this.voicePlaybackToken = 0;
        this.voicePlaybackFinished = true;
        this.voicePlaybackStarted = false;
        this.voiceDuckingState = {
            bgmGain: 1, seGain: 1, requested: false, targetActive: false,
            fadeInterval: null, releaseTimeout: null
        };
        this.soundEffectStates = new Map();
        this.voiceAudio.onvolumechange = () => this.syncVoiceDucking();
    },

    getVoiceEntry(sceneId = this.currentSceneId, commandIndex = this.currentIndex) {
        if (!GameConfig.voiceLanguages.includes(RuntimeState.language) || this.currentSceneLanguage !== RuntimeState.language
            || typeof VoiceManifest === 'undefined') return null;
        const entries = VoiceManifest.languages?.[RuntimeState.language]?.entries
            || (RuntimeState.language === (VoiceManifest.language || 'zh') ? VoiceManifest.entries : null);
        return entries?.[`${sceneId}:${commandIndex}`] || null;
    },

    playVoiceForDialogue(sceneId, commandIndex, speakerId) {
        this.stopVoice({ scheduleAuto: false });

        const entry = this.getVoiceEntry(sceneId, commandIndex);
        const voiceSpeaker = typeof VoiceManifest === 'undefined'
            ? speakerId : (VoiceManifest.speakerAliases?.[speakerId] || speakerId);
        if (!entry || entry.speaker !== voiceSpeaker || !RuntimeState.isVoiceEnabled(entry.speaker)) {
            return null;
        }

        const playbackToken = ++this.voicePlaybackToken;
        this.currentVoiceEntry = entry;
        this.voicePlaybackFinished = false;
        this.voicePlaybackStarted = false;
        this.voiceAudio.src = entry.src;
        this.voiceAudio.volume = RuntimeState.getEffectiveVoiceVolume(entry.speaker);
        this.voiceAudio.currentTime = 0;

        const finishPlayback = (error = null) => {
            if (playbackToken !== this.voicePlaybackToken) return;
            if (error) console.warn(`Voice playback failed: ${entry.id}`, error);
            this.voicePlaybackFinished = true;
            this.voicePlaybackStarted = false;
            this.voiceAudio.onended = null;
            this.voiceAudio.onerror = null;
            this.voiceAudio.onplaying = null;
            this.voiceAudio.onpause = null;
            this.syncVoiceDucking();
            if (typeof this.maybeScheduleAutoAdvance === 'function') {
                this.maybeScheduleAutoAdvance();
            }
        };

        this.voiceAudio.onended = () => finishPlayback();
        this.voiceAudio.onerror = (event) => finishPlayback(event);
        const markPlaying = () => {
            if (playbackToken !== this.voicePlaybackToken || this.voicePlaybackFinished) return;
            this.voicePlaybackStarted = true;
            this.syncVoiceDucking();
        };
        this.voiceAudio.onplaying = markPlaying;
        this.voiceAudio.onpause = () => {
            if (playbackToken !== this.voicePlaybackToken) return;
            this.voicePlaybackStarted = false;
            this.syncVoiceDucking();
        };

        try {
            const playResult = this.voiceAudio.play();
            if (playResult && typeof playResult.then === 'function') {
                playResult.then(markPlaying).catch((error) => finishPlayback(error));
            } else if (playResult && typeof playResult.catch === 'function') {
                playResult.catch((error) => finishPlayback(error));
            }
        } catch (error) {
            finishPlayback(error);
        }

        return entry;
    },

    stopVoice({ scheduleAuto = false } = {}) {
        this.stopHistoryVoice?.();
        this.voicePlaybackToken = (this.voicePlaybackToken || 0) + 1;
        if (this.voiceAudio) {
            this.voiceAudio.onended = null;
            this.voiceAudio.onerror = null;
            this.voiceAudio.onplaying = null;
            this.voiceAudio.onpause = null;
            this.voiceAudio.pause();
            try {
                this.voiceAudio.currentTime = 0;
            } catch (error) {
                // Some browsers reject seeking before metadata is available.
            }
        }
        this.currentVoiceEntry = null;
        this.voicePlaybackFinished = true;
        this.voicePlaybackStarted = false;
        this.syncVoiceDucking();
        if (scheduleAuto && typeof this.maybeScheduleAutoAdvance === 'function') {
            this.maybeScheduleAutoAdvance();
        }
    },

    setCurrentVoiceVolume() {
        this.updateHistoryVoiceVolume?.();
        if (!this.voiceAudio) return;
        this.voiceAudio.volume = RuntimeState.getEffectiveVoiceVolume(this.currentVoiceEntry?.speaker);
        this.syncVoiceDucking();
    },

    isCurrentVoiceFinished() {
        return this.voicePlaybackFinished !== false;
    },

    getVoiceDuckingConfig() {
        const config = GameConfig.voiceDucking || {};
        const gain = (value, fallback) => Number.isFinite(Number(value))
            ? Math.max(0, Math.min(1, Number(value))) : fallback;
        const time = (value, fallback) => Number.isFinite(Number(value))
            ? Math.max(0, Number(value)) : fallback;
        return {
            enabled: config.enabled !== false,
            bgmGain: gain(config.bgmGain, 0.35), seGain: gain(config.seGain, 0.5),
            attackMs: time(config.attackMs, 180), releaseMs: time(config.releaseMs, 700),
            holdMs: time(config.holdMs, 120)
        };
    },

    syncVoiceDucking() {
        const audio = this.voiceAudio;
        const storyAudible = Boolean(this.currentVoiceEntry && this.voicePlaybackStarted
            && this.voicePlaybackFinished === false && audio && !audio.paused
            && !audio.ended && !audio.muted && audio.volume > 0);
        const history = this.historyVoicePlayback;
        const historyAudible = Boolean(history?.started && !history.audio.paused
            && !history.audio.ended && !history.audio.muted && history.audio.volume > 0);
        this.setVoiceDuckingActive(storyAudible || historyAudible);
    },

    setVoiceDuckingActive(active) {
        const state = this.voiceDuckingState;
        if (!state) return;
        const config = this.getVoiceDuckingConfig();
        state.requested = Boolean(active && config.enabled);
        if (state.requested) {
            if (state.releaseTimeout !== null) {
                clearTimeout(state.releaseTimeout);
                state.releaseTimeout = null;
            }
            if (!state.targetActive) this.fadeVoiceDucking(true);
            return;
        }
        if (!state.targetActive || state.releaseTimeout !== null) return;
        // A short hold keeps adjacent dialogue from pumping the background.
        state.releaseTimeout = setTimeout(() => {
            state.releaseTimeout = null;
            if (!state.requested) this.fadeVoiceDucking(false);
        }, config.holdMs);
    },

    fadeVoiceDucking(active) {
        const state = this.voiceDuckingState;
        if (!state) return;
        if (state.fadeInterval !== null) {
            clearInterval(state.fadeInterval);
            state.fadeInterval = null;
        }
        const config = this.getVoiceDuckingConfig();
        const fromBgm = state.bgmGain, fromSe = state.seGain;
        const targetBgm = active ? config.bgmGain : 1;
        const targetSe = active ? config.seGain : 1;
        const duration = active ? config.attackMs : config.releaseMs;
        const startedAt = performance.now();
        state.targetActive = active;
        const tick = () => {
            const progress = duration === 0 ? 1
                : Math.max(0, Math.min(1, (performance.now() - startedAt) / duration));
            const eased = progress * progress * (3 - 2 * progress);
            state.bgmGain = fromBgm + (targetBgm - fromBgm) * eased;
            state.seGain = fromSe + (targetSe - fromSe) * eased;
            this.updateBgmVolume();
            this.updateActiveSoundEffectVolumes();
            if (progress >= 1 && state.fadeInterval !== null) {
                clearInterval(state.fadeInterval);
                state.fadeInterval = null;
            }
        };
        if (duration > 0) state.fadeInterval = setInterval(tick, 20);
        tick();
    },

    getEffectiveSoundEffectVolume(volume = 1, fadeGain = 1) {
        const baseVolume = Math.max(0, Math.min(1, (Number(volume) || 0) * RuntimeState.seVolume));
        return Math.max(0, Math.min(1, baseVolume * fadeGain
            * (this.voiceDuckingState?.seGain ?? 1)));
    },

    updateSoundEffectVolume(audio) {
        const state = this.soundEffectStates?.get(audio);
        if (state) audio.volume = this.getEffectiveSoundEffectVolume(state.volume, state.fadeGain);
    },

    updateActiveSoundEffectVolumes() {
        this.activeSoundEffects?.forEach(audio => this.updateSoundEffectVolume(audio));
    },

    releaseSoundEffect(audio, stop = false) {
        const state = this.soundEffectStates?.get(audio);
        if (state) {
            if (state.durationTimeout !== null) clearTimeout(state.durationTimeout);
            if (state.fadeInterval !== null) clearInterval(state.fadeInterval);
            this.soundEffectStates.delete(audio);
        }
        audio.onended = null;
        audio.onerror = null;
        if (stop) {
            audio.pause();
            try { audio.currentTime = 0; } catch (error) { /* Metadata may not be ready. */ }
        }
        const index = this.activeSoundEffects.indexOf(audio);
        if (index > -1) this.activeSoundEffects.splice(index, 1);
    },

    fadeSoundEffectOut(audio) {
        const state = this.soundEffectStates?.get(audio);
        if (!state) return;
        if (state.fadeInterval !== null) clearInterval(state.fadeInterval);
        const startedAt = performance.now(), from = state.fadeGain;
        state.fadeInterval = setInterval(() => {
            const progress = Math.max(0, Math.min(1, (performance.now() - startedAt) / 500));
            const eased = progress * progress * (3 - 2 * progress);
            state.fadeGain = from * (1 - eased);
            this.updateSoundEffectVolume(audio);
            if (progress >= 1) this.releaseSoundEffect(audio, true);
        }, 20);
    },

    playSoundEffect(assetKey, volume = 1.0, duration = 0) {
        const url = GameConfig.soundEffects[assetKey];
        if (!url) {
            console.warn(`Sound Effect ${assetKey} not found.`);
            return;
        }

        const audio = new Audio(url);
        if (!this.soundEffectStates) this.soundEffectStates = new Map();
        const state = { volume, fadeGain: 1, durationTimeout: null, fadeInterval: null };
        this.soundEffectStates.set(audio, state);
        this.activeSoundEffects.push(audio);
        this.updateSoundEffectVolume(audio);
        audio.onended = () => this.releaseSoundEffect(audio);
        audio.onerror = () => this.releaseSoundEffect(audio, true);
        const failPlayback = (error) => {
            console.error('Audio play failed:', error);
            this.releaseSoundEffect(audio, true);
        };
        try {
            const playResult = audio.play();
            if (playResult && typeof playResult.catch === 'function') playResult.catch(failPlayback);
        } catch (error) {
            failPlayback(error);
        }
        if (duration > 0 && this.soundEffectStates.has(audio)) {
            state.durationTimeout = setTimeout(() => {
                state.durationTimeout = null;
                this.fadeSoundEffectOut(audio);
            }, duration * 1000);
        }
    },

    stopAllSoundEffects() {
        [...this.activeSoundEffects].forEach(audio => this.releaseSoundEffect(audio, true));
    },

    clearBgmFadeIntervals() {
        if (this.bgmFadeInInterval) {
            clearInterval(this.bgmFadeInInterval);
            this.bgmFadeInInterval = null;
        }
        if (this.bgmFadeOutInterval) {
            clearInterval(this.bgmFadeOutInterval);
            this.bgmFadeOutInterval = null;
        }
    },

    playBgm(assetKey, volume = 0.5) {
        // Handle "stop" command to fade out and stop BGM
        if (assetKey === 'stop') {
            this.clearBgmFadeIntervals();
            if (!this.bgm.paused) this.fadeBgmGain(0, () => this.bgm.pause());
            return;
        }

        const url = GameConfig.bgm[assetKey];
        if (!url) {
            console.warn("BGM not found: " + assetKey);
            return;
        }

        const targetVolume = Math.max(0, Math.min(1, Number(volume) || 0));
        // A request for the current track also cancels a pending switch away.
        if (this.bgm.src.includes(url) && !this.bgm.paused) {
            this.currentTrackVolume = targetVolume;
            if (this.bgmFadeOutInterval) {
                this.clearBgmFadeIntervals();
                this.fadeBgmGain(1);
            }
            this.updateBgmVolume();
            return;
        }
        this.clearBgmFadeIntervals();


        // Fade Out current BGM
        if (!this.bgm.paused) {
            this.fadeBgmGain(0, () => this.startBgmFadeIn(url, targetVolume));
        } else {
            // No BGM playing, start immediately
            this.startBgmFadeIn(url, targetVolume);
        }
    },

    updateBgmVolume() {
        if (this.bgm) this.bgm.volume = Math.max(0, Math.min(1,
            (this.currentTrackVolume ?? 0.5) * RuntimeState.bgmVolume * (this.bgmGain ?? 1)
                * (this.voiceDuckingState?.bgmGain ?? 1)));
    },

    fadeBgmGain(target, onComplete = () => {}) {
        const start = performance.now();
        const from = this.bgmGain ?? 1;
        const intervalKey = target === 0 ? 'bgmFadeOutInterval' : 'bgmFadeInInterval';
        const timer = setInterval(() => {
            const progress = Math.max(0, Math.min(1, (performance.now() - start) / 500));
            this.bgmGain = from + (target - from) * progress;
            // Read the latest master volume on every tick, including while muted.
            this.updateBgmVolume();
            if (progress >= 1) {
                clearInterval(timer);
                this[intervalKey] = null;
                onComplete();
            }
        }, 25);
        this[intervalKey] = timer;
    },

    startBgmFadeIn(url, trackVolume) {
        this.currentTrackVolume = trackVolume;
        this.bgmGain = 0;
        this.bgm.src = url;
        this.updateBgmVolume();
        this.bgm.play().catch(e => console.error("BGM Play failed", e));

        this.fadeBgmGain(1);
    }
};
