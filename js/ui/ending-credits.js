const EndingCreditsMethods = {
    initializeEndingCredits() {
        this.endingCreditsOverlay = document.getElementById('ending-credits-overlay');
        this.endingCreditsBackground = document.getElementById('ending-credits-background');
        this.endingCreditsViewport = document.getElementById('ending-credits-viewport');
        this.endingCreditsTrack = document.getElementById('ending-credits-track');
        this.endingCreditsSkip = document.getElementById('ending-credits-skip');
        this.endingCreditsActive = false;
        this.endingCreditsFinished = false;
    },

    createEndingCreditsBlock(block) {
        if (block.type === 'spacer') {
            const spacer = document.createElement('div');
            spacer.className = 'ending-credits-spacer';
            spacer.setAttribute('aria-hidden', 'true');
            return spacer;
        }

        if (block.type === 'heading') {
            const heading = document.createElement('div');
            heading.className = `ending-credits-heading ending-credits-heading--${block.level}`;
            heading.textContent = block.text;
            return heading;
        }

        if (block.type === 'credit') {
            const row = document.createElement('div');
            row.className = `ending-credits-row${block.value ? '' : ' ending-credits-row--solo'}`;

            const label = document.createElement('span');
            label.className = 'ending-credits-label';
            label.textContent = block.label;
            row.appendChild(label);

            if (block.value) {
                const value = document.createElement('span');
                value.className = 'ending-credits-value';
                value.textContent = block.value;
                row.appendChild(value);
            }
            return row;
        }

        const paragraph = document.createElement('div');
        paragraph.className = 'ending-credits-paragraph';
        paragraph.textContent = block.text || '';
        return paragraph;
    },

    getEndingCreditsMedia() {
        const media = Array.isArray(GameConfig.endingCredits?.media)
            ? GameConfig.endingCredits.media
            : [];
        const variants = ['polaroid', 'film', 'tape', 'soft', 'double'];
        const scales = [1.04, 0.96, 1.08, 1, 1.03];
        const denseMedia = media.length > 1
            ? [...media, ...media.slice(Math.ceil(media.length / 2)), ...media.slice(0, Math.ceil(media.length / 2))]
            : media;
        return denseMedia.map((src, index) => ({
            src,
            side: index % 2 === 0 ? 'left' : 'right',
            tilt: index % 2 === 0 ? -2.5 - (index % 3) : 2 + (index % 3),
            inset: 0.8 + (index % 3) * 1.15,
            variant: variants[index % variants.length],
            scale: scales[index % scales.length]
        }));
    },

    renderEndingCredits() {
        if (!this.endingCreditsTrack || typeof EndingCreditsData === 'undefined') return false;
        this.endingCreditsTrack.replaceChildren();

        const copy = document.createElement('div');
        copy.className = 'ending-credits-copy';
        let credits = EndingCreditsData;
        if (RuntimeState.language === 'ja' && typeof EndingCreditsJa !== 'undefined') {
            credits = EndingCreditsJa;
        } else if (RuntimeState.language === 'en' && typeof EndingCreditsEn !== 'undefined') {
            credits = EndingCreditsEn;
        }
        credits.blocks.forEach((block) => copy.appendChild(this.createEndingCreditsBlock(block)));
        this.endingCreditsTrack.appendChild(copy);

        const media = this.getEndingCreditsMedia();
        media.forEach((item, index) => {
            const frame = document.createElement('figure');
            frame.className = `ending-credits-card ending-credits-card--${item.side} ending-credits-card--${item.variant}`;
            frame.style.setProperty('--ending-card-tilt', `${item.tilt}deg`);
            frame.style.setProperty('--ending-card-inset', `${item.inset}cqw`);
            frame.style.setProperty('--ending-card-scale', item.scale);
            frame.style.top = `${copy.offsetTop + copy.offsetHeight * ((index + 0.55) / media.length)}px`;
            frame.setAttribute('aria-hidden', 'true');

            const image = document.createElement('img');
            image.src = item.src;
            image.alt = '';
            image.loading = 'lazy';
            image.decoding = 'async';
            image.addEventListener('error', () => frame.remove(), { once: true });
            frame.appendChild(image);
            this.endingCreditsTrack.appendChild(frame);
        });
        return true;
    },

    startEndingCredits(command = {}, onComplete = null) {
        if (this.endingCreditsActive) return;
        if (!this.endingCreditsOverlay || !this.renderEndingCredits()) {
            console.warn('Ending credits are unavailable; continuing to scene end.');
            if (onComplete) onComplete();
            return;
        }

        this.endingCreditsActive = true;
        this.endingCreditsFinished = false;
        if (command.preview !== true) SaveManager.set('cleared', true);
        this.setGameState(GameState.CREDITS);
        const scope = this.beginActivity();

        this.stopVoice({ scheduleAuto: false });
        this.stopAllSoundEffects();
        if (this.isAutoPlaying) {
            this.isAutoPlaying = false;
            if (this.autoBtn) this.autoBtn.classList.remove('active');
        }
        if (this.autoTimeout) {
            clearTimeout(this.autoTimeout);
            this.autoTimeout = null;
        }

        this.dialogueBox?.classList.add('hidden');
        this.charLayer?.classList.add('hidden');

        const backgroundUrl = GameConfig.backgrounds?.[command.background || 'BG_Ending_Credits'];
        this.endingCreditsBackground.style.background = backgroundUrl && (backgroundUrl.startsWith('#') || backgroundUrl.includes('gradient(')) ? backgroundUrl : backgroundUrl ? `url('${backgroundUrl}')` : '#16202c';
        this.endingCreditsSkip.textContent = this.t('creditsSkip');
        this.endingCreditsOverlay.setAttribute('aria-hidden', 'false');
        this.endingCreditsOverlay.classList.remove('ending-credits-overlay--closing');
        this.endingCreditsOverlay.classList.add('ending-credits-overlay--visible');
        this.endingCreditsTrack.style.transform = 'translate3d(0, 0, 0)';

        const themeKey = command.themes?.[RuntimeState.language]
            || command.themes?.ja
            || command.themes?.zh
            || 'BGM_Lingering_Keys_Japanese';
        if (GameConfig.bgm?.[themeKey]) {
            this.bgm.loop = false;
            const requestedVolume = Number(command.volume);
            const themeVolume = Number.isFinite(requestedVolume) ? requestedVolume : 0.65;
            this.playBgm(themeKey, themeVolume);
        }

        const finish = () => this.finishEndingCredits(scope, onComplete);
        scope.listen(this.endingCreditsSkip, 'click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            finish();
        });
        scope.listen(document, 'keydown', (event) => {
            if (event.key === 'Escape' || event.key === 'Enter') {
                event.preventDefault();
                finish();
            }
        });

        const pixelsPerSecond = Math.max(24, Math.min(72, Number(command.speed) || 38));
        const startDelay = 900;
        let startedAt = null;
        const animate = (timestamp) => {
            if (this.endingCreditsFinished) return;
            if (startedAt === null) startedAt = timestamp;
            const viewportHeight = this.endingCreditsViewport.clientHeight || window.innerHeight;
            const distance = Math.max(1, this.endingCreditsTrack.scrollHeight - viewportHeight * 0.28);
            const duration = (distance / pixelsPerSecond) * 1000;
            const elapsed = Math.max(0, timestamp - startedAt - startDelay);
            const progress = Math.min(1, elapsed / duration);
            this.endingCreditsTrack.style.transform = `translate3d(0, ${(-distance * progress).toFixed(2)}px, 0)`;
            if (progress >= 1) finish();
            else scope.animationFrame(animate);
        };
        scope.animationFrame(animate);
    },

    finishEndingCredits(scope, onComplete) {
        if (!this.endingCreditsActive || this.endingCreditsFinished) return;
        this.endingCreditsFinished = true;
        this.endingCreditsOverlay.classList.add('ending-credits-overlay--closing');
        this.clearBgmFadeIntervals();

        const initialGain = this.bgm && !this.bgm.paused ? (this.bgmGain ?? 1) : 0;
        const fadeStartedAt = performance.now();
        const fadeDuration = 500;
        const fadeAudio = (timestamp) => {
            if (this.bgm && !this.bgm.paused) {
                const progress = Math.min(1, (timestamp - fadeStartedAt) / fadeDuration);
                this.bgmGain = Math.max(0, initialGain * (1 - progress));
                this.updateBgmVolume();
                if (progress < 1) scope.animationFrame(fadeAudio);
            }
        };
        scope.animationFrame(fadeAudio);

        scope.timeout(() => {
            if (this.bgm) {
                this.bgm.pause();
                try {
                    this.bgm.currentTime = 0;
                } catch (error) {
                    // Seeking may fail if the ending theme never loaded.
                }
                this.bgm.loop = true;
            }
            this.endingCreditsOverlay.classList.remove(
                'ending-credits-overlay--visible',
                'ending-credits-overlay--closing'
            );
            this.endingCreditsOverlay.setAttribute('aria-hidden', 'true');
            this.endingCreditsTrack.style.transform = '';
            this.endingCreditsActive = false;
            this.endActivity(scope);
            this.setGameState(GameState.DIALOGUE);
            if (onComplete) onComplete();
        }, 650);
    }
};
