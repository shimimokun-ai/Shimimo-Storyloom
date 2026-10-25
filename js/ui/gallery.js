const GalleryMethods = {
    createBilibiliLink(url) {
        const btn = document.createElement('a');
        btn.href = url;
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        btn.className = 'bilibili-link';
        btn.innerText = this.t('bilibili');
        btn.style.marginTop = '20px';
        let opening = false;
        btn.addEventListener('click', async event => {
            event.stopPropagation();
            // Ordinary browser version retains its standard new-tab behavior.
            if (!window.electronAPI?.openBilibiliProfile) return;
            event.preventDefault();
            if (opening) return;
            opening = true;
            try {
                await window.electronAPI.openBilibiliProfile(url);
            } catch (error) {
                console.error('Unable to open Bilibili profile:', error);
                this.showSystemModal(this.t('bilibiliOpenFailed'));
            } finally {
                opening = false;
            }
        });
        return btn;
    },

    unlockCG(assetKey) {
        RuntimeState.unlock('cgs', assetKey);
    },

    openCGGallery() {
        this.cgImageObserver?.disconnect();
        this.cgImageObserver = null;
        this.enterOverlay('cg-gallery');
        this.cgModal.classList.add('visible');
        this.cgContent.innerHTML = ''; // Clear previous

        const unlocked = RuntimeState.getUnlocked('cgs');
        // Native lazy loading can eagerly fetch several screens of large originals.
        // Assign sources only when a thumbnail enters this gallery's scroll viewport.
        if (typeof IntersectionObserver !== 'undefined') {
            const observer = new IntersectionObserver(entries => {
                if (this.cgImageObserver !== observer) return;
                entries.forEach(({ target, isIntersecting }) => {
                    if (!isIntersecting || !target.dataset.cgSrc) return;
                    target.src = target.dataset.cgSrc;
                    delete target.dataset.cgSrc;
                    observer.unobserve(target);
                });
            }, { root: this.cgContent });
            this.cgImageObserver = observer;
        }

        // Use GameConfig.cgs keys to order them or just iterate
        Object.keys(GameConfig.cgs).forEach(key => {
            const thumb = document.createElement('div');
            thumb.className = 'cg-thumbnail';

            if (unlocked.includes(key)) {
                const img = document.createElement('img');
                img.loading = 'lazy';
                img.decoding = 'async'; // Prevent decoding from blocking main thread
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.pointerEvents = 'none';
                thumb.appendChild(img);
                if (this.cgImageObserver) {
                    img.dataset.cgSrc = GameConfig.cgs[key];
                    this.cgImageObserver.observe(img);
                } else {
                    // Older browsers retain their native lazy-loading behavior.
                    img.src = GameConfig.cgs[key];
                }

                thumb.onclick = () => {
                    this.enterOverlay('cg-full-view');
                    this.cgFullView.style.backgroundImage = `url('${GameConfig.cgs[key]}')`;
                    this.cgFullView.classList.add('visible');
                };
            } else {
                thumb.classList.add('locked');
            }
            this.cgContent.appendChild(thumb);
        });
    },

    closeCGGallery() {
        this.cgImageObserver?.disconnect();
        this.cgImageObserver = null;
        this.cgModal.classList.remove('visible');
        this.leaveOverlay('cg-gallery');
    },

    closeCGFullView() {
        this.cgFullView.classList.remove('visible');
        this.leaveOverlay('cg-full-view');
    },

    characterGalleryName(character) {
        const name = this.characterName(character);
        return character === GameConfig.characters[GameConfig.project.protagonist]
            ? this.t('protagonistGalleryName', name)
            : name;
    },

    openCharacterGallery() {
        this.enterOverlay('character-gallery');
        this.charGalleryModal.classList.add('visible');
        this.charListContainer.innerHTML = '';
        this.clearCharDetail();

        const chars = GameConfig.characters;
        const unlocked = RuntimeState.getUnlocked('chars');

        // Always unlock 'player' if game is cleared (just in case)
        // REMOVED: if (!unlocked.includes('player')) unlocked.push('player');
        // Now strictly relying on 'showCharacter' calls during gameplay or manual unlocks if needed.
        // Actually, player should be unlocked if they played.
        if (!unlocked.includes('player') && SaveManager.get('cleared', false)) {
            unlocked.push('player');
        }

        for (const [key, char] of Object.entries(chars)) {
            // Filter: Only show characters with a profile/description
            if (char.profile) {
                const item = document.createElement('div');
                item.className = 'character-list-item';

                const isUnlocked = unlocked.includes(key);

                if (isUnlocked) {
                    item.innerText = this.characterGalleryName(char);
                    item.onclick = () => {
                        // Highlight active
                        Array.from(this.charListContainer.children).forEach(c => c.classList.remove('active'));
                        item.classList.add('active');
                        this.showCharDetail(char);
                    };
                } else {
                    item.innerText = this.t('lockedCharName');
                    item.style.color = '#555';
                    item.style.cursor = 'default';
                    item.onclick = () => {
                        // Optional: Play locked sound or do nothing
                        this.clearCharDetail();
                        this.charDetailDescContainer.innerText = this.t('unlocked');
                    };
                }

                this.charListContainer.appendChild(item);
            }
        }
    },

    unlockCharacter(charId) {
        RuntimeState.unlock('chars', charId);
    },

    closeCharacterGallery() {
        this.cancelCharDetailAnimation();
        this.charGalleryModal.classList.remove('visible');
        this.leaveOverlay('character-gallery');
    },

    cancelCharDetailAnimation() {
        if (this.charDetailSpriteTimer != null) clearTimeout(this.charDetailSpriteTimer);
        if (this.charDetailSpriteFrame != null) cancelAnimationFrame(this.charDetailSpriteFrame);
        this.charDetailSpriteTimer = null;
        this.charDetailSpriteFrame = null;
        const loading = this.charDetailSpriteLoad;
        this.charDetailSpriteLoad = null;
        if (loading) {
            loading.image.onload = loading.image.onerror = null;
            loading.image.removeAttribute('src');
        }
        // A callback already queued for an older selection must not update the shared portrait.
        this.charDetailVersion = (this.charDetailVersion || 0) + 1;
        this.charDetailImage.onclick = null;
        this.charDetailImage.style.opacity = '1';
    },

    showCharDetail(char) {
        this.cancelCharDetailAnimation();
        const detailVersion = this.charDetailVersion;
        this.charDetailImage.style.backgroundImage = 'none';
        // Set Icon
        if (char.icon) {
            this.charDetailIcon.style.backgroundImage = `url('${char.icon}')`;
            this.charDetailIcon.style.display = 'block';
        } else {
            this.charDetailIcon.style.display = 'none';
        }

        this.charDetailName.innerText = this.characterGalleryName(char);
        // Dynamic color gradient based on char.color
        if (char.color) {
            // Check if multiple colors for gradient
            const colors = char.color.split(',');
            if (colors.length > 1) {
                this.charDetailName.style.backgroundImage = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
            } else {
                this.charDetailName.style.backgroundImage = `linear-gradient(135deg, #ffffff 0%, ${char.color} 100%)`;
            }
        } else {
            this.charDetailName.style.backgroundImage = `linear-gradient(135deg, #fff 0%, #e0e0e0 100%)`;
        }

        const p = char.profile;
        const lang = RuntimeState.language;
        const pd = (lang !== 'zh' && p && p[lang]) ? p[lang] : p;

        this.charDetailRole.innerText = pd?.role || this.t('unknown');

        // Clear previous content
        this.charDetailDescContainer.innerHTML = '';

        if (!p) {
            this.charDetailDescContainer.innerText = this.t('noInfo');
            return;
        }

        // 1. Quote
        if (pd.quote) {
            const quoteEl = document.createElement('div');
            quoteEl.className = 'char-quote';
            quoteEl.innerText = pd.quote;
            this.charDetailDescContainer.appendChild(quoteEl);
        }

        // 2. Main Description
        const descEl = document.createElement('div');
        descEl.id = 'char-detail-desc'; // Re-use ID for styling
        descEl.innerText = pd.description || this.t('noDesc');
        this.charDetailDescContainer.appendChild(descEl);

        // 3. Extra Fields
        const addField = (label, value) => {
            if (value) {
                const fEl = document.createElement('div');
                fEl.className = 'char-field';
                fEl.innerHTML = `<strong>${label}:</strong> ${value}`;
                this.charDetailDescContainer.appendChild(fEl);
            }
        };

        addField(this.t('gradeLabel'), pd.grade);
        addField(this.t('likesLabel'), pd.likes);
        addField(this.t('dislikesLabel'), pd.dislikes);

        // 4. Bilibili Link
        if (p.bilibili) {
            this.charDetailDescContainer.appendChild(this.createBilibiliLink(p.bilibili));
        }

        // Show default sprite & Setup cycling
        this.charDetailImage.textContent = Object.keys(char.sprites || {}).length ? '' : this.characterName(char);
        if (Object.keys(char.sprites || {}).length) {
            // Get unique sprites
            const spritePaths = [...new Set(Object.values(char.sprites))];
            let spriteIndex = 0;

            // Find default index if possible
            const defaultPath = char.sprites.default;
            if (defaultPath) {
                const idx = spritePaths.indexOf(defaultPath);
                if (idx !== -1) spriteIndex = idx;
            }

            let hasDisplayedSprite = false;
            const loadSprite = (nextIndex, fade) => {
                const image = new Image();
                const request = { image };
                this.charDetailSpriteLoad = request;
                const isCurrent = () => detailVersion === this.charDetailVersion
                    && this.charDetailSpriteLoad === request;
                const fail = () => {
                    if (!isCurrent()) return;
                    image.onload = image.onerror = null;
                    this.charDetailSpriteLoad = null;
                    // Keep the last good expression; clicking again retries the same target.
                    this.charDetailImage.style.opacity = '1';
                };
                image.decoding = 'async';
                image.onerror = fail;
                image.onload = async () => {
                    if (!isCurrent()) return;
                    try {
                        if (image.decode) await image.decode();
                    } catch {
                        fail();
                        return;
                    }
                    if (!isCurrent()) return;
                    image.onload = image.onerror = null;
                    const show = () => {
                        if (!isCurrent()) return;
                        this.charDetailSpriteTimer = null;
                        this.charDetailSpriteLoad = null;
                        spriteIndex = nextIndex;
                        hasDisplayedSprite = true;
                        this.charDetailImage.style.backgroundImage = `url('${spritePaths[spriteIndex]}')`;
                        if (fade) this.charDetailImage.style.opacity = '1';
                        else this.charDetailSpriteFrame = requestAnimationFrame(() => {
                            if (detailVersion !== this.charDetailVersion) return;
                            this.charDetailSpriteFrame = null;
                            if (this.charDetailSpriteTimer == null) this.charDetailImage.style.opacity = '1';
                        });
                    };
                    // A slow disk/network/decode must not fade a working portrait to blank.
                    this.charDetailImage.style.opacity = '0';
                    if (fade) this.charDetailSpriteTimer = setTimeout(show, 200);
                    else show();
                };
                image.src = spritePaths[nextIndex];
            };

            // Only the selected default and explicitly requested expressions are loaded.
            if (spritePaths.length) loadSprite(spriteIndex, false);
            this.charDetailImage.onclick = () => {
                if (detailVersion !== this.charDetailVersion || this.charDetailSpriteLoad
                    || this.charDetailSpriteTimer != null) return;
                if (spritePaths.length && (!hasDisplayedSprite || spritePaths.length > 1)) {
                    loadSprite(hasDisplayedSprite ? (spriteIndex + 1) % spritePaths.length : spriteIndex,
                        hasDisplayedSprite);
                }
            };
        } else {
            this.charDetailImage.style.backgroundImage = 'none';
            this.charDetailImage.onclick = null;
            this.charDetailImage.style.opacity = '1';
        }
    },

    clearCharDetail() {
        this.cancelCharDetailAnimation();
        this.charDetailName.innerText = "";
        this.charDetailIcon.style.display = 'none';
        this.charDetailRole.innerText = "";
        this.charDetailDescContainer.innerHTML = `<div style='color:#888; text-align:center; padding-top:50px;'>${this.t('selectCharacter')}</div>`;
        this.charDetailImage.style.backgroundImage = 'none';
    }
};
