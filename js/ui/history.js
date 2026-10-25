const HistoryMethods = {
    openHistory() {
        this.historyScope?.clear();
        this.stopVoice({ scheduleAuto: false });
        const scope = this.historyScope = new ActivityScope();
        scope.defer(() => this.stopHistoryVoice());
        scope.listen(document, 'visibilitychange', () => {
            if (document.hidden) this.stopHistoryVoice();
        });
        scope.listen(window, 'pagehide', () => this.stopHistoryVoice());
        this.enterOverlay('history');
        this.historyModal.classList.add('visible');
        this.historyContent.innerHTML = '';

        if (this.historyLog.length === 0) {
            this.historyContent.innerHTML = `<div style="text-align:center; margin-top:50px; color:#aaa;">${this.t('noHistory')}</div>`;
            return;
        }

        this.historyLog.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'history-entry';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'history-speaker';

            // Use the same speaker label as the dialogue nameplate.
            let displayName = entry.speaker;
            if (GameConfig && GameConfig.characters && GameConfig.characters[entry.speaker]) {
                displayName = this.dialogueSpeakerName(entry.speaker);
                // Optional: Use character specific color
                if (GameConfig.characters[entry.speaker].color) {
                    let color = GameConfig.characters[entry.speaker].color;
                    if (color.includes(',')) color = color.split(',')[0].trim();
                    nameDiv.style.color = color;
                }
            } else if (entry.speaker === 'system') {
                displayName = this.t('systemName');
                nameDiv.style.color = '#888';
            }

            nameDiv.innerText = displayName;

            const textDiv = document.createElement('div');
            textDiv.className = 'history-text';
            textDiv.innerText = entry.text;

            const dialogue = document.createElement('div');
            dialogue.className = 'history-dialogue';
            dialogue.appendChild(textDiv);
            const voice = this.getHistoryVoiceEntry(entry);
            if (voice) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'history-voice-button';
                this.updateHistoryVoiceButton(button, voice);
                scope.listen(button, 'click', event => {
                    event.stopPropagation();
                    this.playHistoryVoice(entry, button);
                });
                dialogue.appendChild(button);
            }

            div.appendChild(nameDiv);
            div.appendChild(dialogue);
            this.historyContent.appendChild(div);
        });

        // Scroll to bottom
        scope.timeout(() => {
            this.historyContent.scrollTop = this.historyContent.scrollHeight;
            this.historyClose?.focus({ preventScroll: true });
        }, 0);
    },

    closeHistory() {
        this.historyScope?.clear();
        this.historyScope = null;
        this.historyModal.classList.remove('visible');
        this.leaveOverlay('history', GameState.DIALOGUE);
        this.maybeScheduleAutoAdvance();
    },

    getHistoryVoiceEntry(entry) {
        if (!GameConfig.voiceLanguages.includes(RuntimeState.language) || entry.language !== RuntimeState.language
            || typeof VoiceManifest === 'undefined' || !entry.sceneId
            || !Number.isInteger(entry.commandIndex)) return null;
        const entries = VoiceManifest.languages?.[RuntimeState.language]?.entries
            || (RuntimeState.language === (VoiceManifest.language || 'zh') ? VoiceManifest.entries : null);
        const voice = entries?.[`${entry.sceneId}:${entry.commandIndex}`];
        const speaker = VoiceManifest.speakerAliases?.[entry.speaker] || entry.speaker;
        return voice?.speaker === speaker ? voice : null;
    },

    updateHistoryVoiceButton(button, voice, playing = false, failed = false) {
        const key = failed ? 'historyVoiceError' : playing ? 'historyVoiceStop' : 'historyVoicePlay';
        button.textContent = `${playing ? '■' : '▶'} ${this.t(key)}`;
        button.disabled = RuntimeState.getEffectiveVoiceVolume(voice.speaker) <= 0;
        button.title = button.disabled ? this.t('historyVoiceMuted') : this.t(key);
        button.setAttribute('aria-label', button.title);
        button.setAttribute('aria-pressed', String(playing));
    },

    playHistoryVoice(entry, button) {
        if (!this.historyModal.classList.contains('visible') || document.hidden) return;
        if (this.historyVoicePlayback?.button === button) {
            this.stopHistoryVoice();
            return;
        }
        this.stopHistoryVoice();
        const voice = this.getHistoryVoiceEntry(entry);
        if (!voice) return;
        if (RuntimeState.getEffectiveVoiceVolume(voice.speaker) <= 0) {
            this.updateHistoryVoiceButton(button, voice);
            return;
        }
        // Use a separate player: replay must not modify the current story line or AUTO state.
        this.stopVoice({ scheduleAuto: false });
        const audio = new Audio();
        const playback = this.historyVoicePlayback = { audio, button, voice, started: false };
        audio.preload = 'auto';
        audio.src = voice.src;
        audio.volume = RuntimeState.getEffectiveVoiceVolume(voice.speaker);
        this.updateHistoryVoiceButton(button, voice, true);
        const finish = (error = null) => {
            if (this.historyVoicePlayback !== playback) return;
            this.stopHistoryVoice();
            if (error) {
                console.warn(`History voice playback failed: ${voice.id}`, error);
                this.updateHistoryVoiceButton(button, voice, false, true);
            }
        };
        const markPlaying = () => {
            if (this.historyVoicePlayback !== playback) return;
            playback.started = true;
            this.syncVoiceDucking();
        };
        audio.onplaying = markPlaying;
        audio.onended = () => finish();
        audio.onerror = event => finish(event);
        audio.onpause = () => {
            if (this.historyVoicePlayback !== playback) return;
            playback.started = false;
            this.syncVoiceDucking();
        };
        audio.onvolumechange = () => this.syncVoiceDucking();
        try {
            const result = audio.play();
            if (result?.then) result.then(markPlaying).catch(finish);
        } catch (error) {
            finish(error);
        }
    },

    updateHistoryVoiceVolume() {
        const playback = this.historyVoicePlayback;
        if (!playback) return;
        const volume = RuntimeState.getEffectiveVoiceVolume(playback.voice.speaker);
        if (volume <= 0) this.stopHistoryVoice();
        else playback.audio.volume = volume;
        this.updateHistoryVoiceButton(playback.button, playback.voice, this.historyVoicePlayback === playback);
    },

    stopHistoryVoice() {
        const playback = this.historyVoicePlayback;
        if (!playback) return;
        this.historyVoicePlayback = null;
        const { audio, button, voice } = playback;
        audio.onplaying = audio.onended = audio.onerror = audio.onpause = audio.onvolumechange = null;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        this.updateHistoryVoiceButton(button, voice);
        this.syncVoiceDucking();
    }
};
