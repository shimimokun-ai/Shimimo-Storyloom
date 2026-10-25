const LoadMenuMethods = {
    updateLoadButtonState() {
        // Always active
        if (this.loadBtn) this.loadBtn.style.filter = 'none';
    },

    openLoadMenu() {
        this.enterOverlay('load-menu');
        // ALWAYS OPEN, filter inside
        this.loadModal.classList.add('visible');
        this.loadModal.setAttribute('aria-hidden', 'false');
        this.loadContent.innerHTML = '';

        const chapters = this.getChapterList();
        // Default unlock Chapter 1 (index 0)
        const savedUnlocked = RuntimeState.getUnlocked('chapters');
        const unlocked = [...new Set(savedUnlocked.map(value => this.getChapterUnlockId(value)))];
        if (chapters.length && !unlocked.includes(chapters[0].id)) unlocked.push(chapters[0].id);

        // Migrate title-based saves to language-independent chapter IDs.
        if (JSON.stringify(unlocked) !== JSON.stringify(savedUnlocked)) {
            RuntimeState.setUnlocked('chapters', unlocked);
        }

        chapters.forEach(chap => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'chapter-btn';
            btn.dataset.chapterId = chap.id;

            const isUnlocked = unlocked.includes(chap.id);

            const translationPending = RuntimeState.language === 'en'
                && !StoryRepository.getManifest('en')[chap.scene];
            if (isUnlocked && translationPending) {
                btn.innerText = `${chap.title} — ${this.t('translationPending')}`;
                btn.classList.add('locked');
                btn.disabled = true;
            } else if (isUnlocked) {
                btn.innerText = chap.title;
                btn.setAttribute('aria-label', chap.title);
                btn.onclick = () => {
                    this.closeLoadMenu();
                    // Start game logic
                    this.mainMenu.style.display = 'none';
                    this.dialogueBox.classList.remove('hidden');
                    this.loadScene(chap.scene);
                };
            } else {
                btn.innerText = this.t('unlocked');
                btn.classList.add('locked');
                btn.disabled = true;
                btn.setAttribute('aria-label', this.t('unlocked'));
            }
            this.loadContent.appendChild(btn);
        });

        this.loadContent.scrollTop = 0;
    },

    closeLoadMenu() {
        this.loadModal.classList.remove('visible');
        this.loadModal.setAttribute('aria-hidden', 'true');
        this.leaveOverlay('load-menu');
    }
};
