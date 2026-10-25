const WritingGameMethods = {
    startWritingGame() {
        this.setGameState(GameState.MINIGAME);
        const scope = this.beginActivity();
        this.isWritingActive = true;
        scope.defer(() => { this.isWritingActive = false; });
        this.stopVoice({ scheduleAuto: false });
        this.stopAllSoundEffects();
        const container = document.getElementById('writing-game-container');
        const canvas = document.getElementById('writing-canvas'), ctx = canvas.getContext('2d');
        const kit = ArcadeKit, t = kit.text;
        const W = 300, H = 500;
        const previousFocus = document.activeElement;
        this.dialogueBox.classList.add('hidden');
        this.charLayer.classList.add('hidden');

        // A quiet story activity, not an arcade challenge: keep the slip itself central.
        container.className = 'writing-overlay visible';
        container.inert = false;
        container.setAttribute('aria-hidden', 'false');
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('aria-labelledby', 'writing-title');
        const content = kit.element('div', 'writing-content');
        const title = kit.element('h2', 'writing-title', this.t('writingTitle'));
        title.id = 'writing-title';
        const paper = kit.element('div', 'writing-paper');
        canvas.className = 'writing-canvas';
        canvas.tabIndex = 0;
        canvas.setAttribute('aria-label', this.t('writingTitle'));
        const notice = kit.element('div', 'writing-notice');
        notice.setAttribute('role', 'status');
        notice.hidden = true;
        paper.append(canvas, notice);
        const tools = kit.element('div', 'writing-tools');
        tools.setAttribute('role', 'group');
        tools.setAttribute('aria-label', t('writingStep1'));
        const confirmation = kit.element('div', 'writing-confirm-overlay');
        confirmation.hidden = true;
        const confirmCard = kit.element('div', 'writing-confirm');
        confirmCard.setAttribute('role', 'alertdialog');
        confirmCard.setAttribute('aria-modal', 'true');
        confirmCard.setAttribute('aria-labelledby', 'writing-clear-title');
        confirmCard.setAttribute('aria-describedby', 'writing-clear-description');
        const confirmTitle = kit.element('h3', '', t('clear'));
        confirmTitle.id = 'writing-clear-title';
        const confirmDescription = kit.element('p', '', t('clearConfirm'));
        confirmDescription.id = 'writing-clear-description';
        const confirmActions = kit.element('div', 'writing-confirm-actions');
        confirmCard.append(confirmTitle, confirmDescription, confirmActions);
        confirmation.append(confirmCard);
        content.append(title, paper, tools);
        container.replaceChildren(content, confirmation);

        const button = (label, action, className = '') => {
            const node = kit.element('button', `writing-button ${className}`, label);
            node.type = 'button';
            scope.listen(node, 'click', event => {
                // Stop here before finishing can restore the story underneath this click.
                event.stopPropagation();
                if (!finished) action();
            });
            return node;
        };
        const strokes = [];
        let current = null, pointerId = null, brush = 6, dirty = true, finished = false;
        let confirmOpen = false, resizePending = true, paintPending = false, noticeTimer = null;
        const brushButtons = [];
        const inkDistance = () => strokes.reduce((sum, stroke) => sum + stroke.distance, 0);
        const invalidate = () => {
            dirty = true;
            if (paintPending || scope.closed) return;
            paintPending = true;
            scope.animationFrame(() => { paintPending = false; draw(); });
        };
        const notify = message => {
            scope.clearTimer(noticeTimer);
            notice.textContent = message;
            notice.hidden = false;
            noticeTimer = scope.timeout(() => { notice.hidden = true; }, 1800);
        };
        const refresh = () => {
            const blocked = finished || confirmOpen;
            content.inert = blocked;
            undo.disabled = blocked || strokes.length === 0;
            clear.disabled = blocked || strokes.length === 0;
            finish.disabled = blocked;
            brushButtons.forEach(button => { button.disabled = blocked; });
        };
        const stopStroke = () => {
            const releasedId = pointerId;
            pointerId = null; current = null;
            if (releasedId !== null && canvas.hasPointerCapture(releasedId)) canvas.releasePointerCapture(releasedId);
            invalidate();
        };
        const chooseBrush = size => {
            if (finished || confirmOpen) return;
            stopStroke(); brush = size;
            brushButtons.forEach((button, index) => button.setAttribute('aria-pressed', String([3, 6, 10][index] === size)));
            refresh();
        };
        [3, 6, 10].forEach((size, index) => {
            const choice = button(t(['thin', 'medium', 'thick'][index]), () => chooseBrush(size), 'writing-brush');
            choice.setAttribute('aria-pressed', String(size === brush));
            brushButtons.push(choice); tools.append(choice);
        });
        const undoStroke = () => {
            if (finished || confirmOpen || !strokes.length) return;
            stopStroke(); strokes.pop(); invalidate(); refresh();
        };
        const undo = button(t('undo'), undoStroke);
        undo.title = 'Ctrl / Cmd + Z';
        const returnToPaper = () => {
            confirmOpen = false; confirmation.hidden = true;
            refresh(); canvas.focus({ preventScroll: true });
        };
        const cancel = button(t('cancel'), returnToPaper);
        confirmActions.append(cancel, button(t('clear'), () => {
            if (!confirmOpen) return;
            strokes.length = 0; invalidate(); returnToPaper();
        }, 'writing-button-confirm'));
        const clear = button(t('clear'), () => {
            if (finished || confirmOpen || !strokes.length) return;
            stopStroke(); confirmOpen = true; confirmation.hidden = false;
            refresh(); cancel.focus({ preventScroll: true });
        });
        const finish = button(this.t('finish'), () => {
            if (finished || confirmOpen) return;
            stopStroke(); finished = true;
            // A blank, cleared or entirely undone slip does not earn the achievement.
            if (inkDistance() >= 3) AchievementManager.unlock('ema_complete');
            this.endActivity(scope); this.setGameState(GameState.DIALOGUE); this.currentIndex++; this.processCommand();
        }, 'writing-finish');
        finish.id = 'writing-finish-btn';
        tools.append(undo, clear);
        content.append(finish);
        const position = event => {
            const rect = canvas.getBoundingClientRect();
            return {
                x: kit.clamp((event.clientX - rect.left) * W / rect.width, 20, W - 20),
                y: kit.clamp((event.clientY - rect.top) * H / rect.height, 58, H - 26),
                pressure: event.pointerType === 'pen' ? kit.clamp(event.pressure || 0.5, 0.15, 1) : 0.65
            };
        };
        scope.listen(canvas, 'pointerdown', event => {
            if (finished || confirmOpen || event.button !== 0 || pointerId !== null) return;
            event.preventDefault(); canvas.focus({ preventScroll: true });
            if (strokes.length >= 256) { notify(t('paperFull')); return; }
            const point = position(event);
            current = { size: brush, points: [point], distance: 0 }; strokes.push(current);
            pointerId = event.pointerId; canvas.setPointerCapture(pointerId); invalidate(); refresh();
        });
        scope.listen(canvas, 'pointermove', event => {
            if (!current || event.pointerId !== pointerId || finished || confirmOpen) return;
            event.preventDefault();
            const events = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
            for (const input of (events.length ? events : [event])) {
                const point = position(input), previous = current.points[current.points.length - 1];
                const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
                if (distance < 0.65) continue;
                if (current.points.length >= 2048) { stopStroke(); notify(t('paperFull')); break; }
                current.points.push(point); current.distance += distance; invalidate();
            }
        });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type =>
            scope.listen(canvas, type, event => { if (event.pointerId === pointerId) stopStroke(); }));
        scope.listen(window, 'blur', stopStroke);
        scope.listen(document, 'visibilitychange', stopStroke);
        scope.listen(container, 'click', event => event.stopPropagation());
        scope.listen(document, 'keydown', event => {
            if (finished || event.isComposing) return;
            if (event.key === 'Tab') {
                const target = confirmOpen ? confirmCard : content;
                const nodes = [...target.querySelectorAll('button:not(:disabled), canvas[tabindex="0"]')];
                if (!nodes.length) return;
                event.preventDefault(); event.stopPropagation();
                const index = nodes.indexOf(document.activeElement);
                const next = index < 0 ? (event.shiftKey ? nodes.length - 1 : 0)
                    : (index + (event.shiftKey ? -1 : 1) + nodes.length) % nodes.length;
                nodes[next].focus({ preventScroll: true });
            } else if (event.key === 'Escape') {
                event.preventDefault(); event.stopImmediatePropagation();
                stopStroke(); if (confirmOpen) returnToPaper();
            } else if (!confirmOpen && event.code === 'KeyZ' && (event.ctrlKey || event.metaKey) && !event.altKey) {
                event.preventDefault(); event.stopPropagation(); if (!event.repeat) undoStroke();
            }
        }, true);
        scope.defer(() => {
            finished = true; stopStroke();
            container.classList.remove('visible'); container.inert = true;
            container.setAttribute('aria-hidden', 'true');
            container.replaceChildren(canvas);
            canvas.width = W; canvas.height = H;
            this.charLayer.classList.remove('hidden'); this.dialogueBox.classList.remove('hidden');
            if (previousFocus?.isConnected && !container.contains(previousFocus)) previousFocus.focus({ preventScroll: true });
        });
        const resize = () => { resizePending = true; invalidate(); };
        scope.listen(window, 'resize', resize);
        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(resize);
            observer.observe(canvas); scope.defer(() => observer.disconnect());
        }
        const draw = () => {
            if (resizePending) {
                const rect = canvas.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                const density = kit.clamp(Math.min(rect.width / W, rect.height / H) * (window.devicePixelRatio || 1), 1, 3);
                const width = Math.round(W * density), height = Math.round(H * density);
                if (canvas.width !== width || canvas.height !== height) {
                    canvas.width = width; canvas.height = height;
                }
                resizePending = false;
            }
            if (!dirty) return; dirty = false;
            ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
            const paper = ctx.createLinearGradient(0, 0, W, H);
            paper.addColorStop(0, '#e7aaa0'); paper.addColorStop(0.5, '#dc9990'); paper.addColorStop(1, '#ca827c');
            ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = '#b56e6826'; ctx.lineWidth = 0.6;
            for (let y = 6; y < H; y += 7) {
                ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(W - 10, y + (y % 5 - 2)); ctx.stroke();
            }
            ctx.strokeStyle = '#f2d7a0'; ctx.lineWidth = 3; ctx.strokeRect(9, 9, W - 18, H - 18);
            ctx.strokeStyle = '#edc38d9c'; ctx.lineWidth = 1; ctx.strokeRect(16, 16, W - 32, H - 32);
            // Punched hole and a short cord are drawn into the paper itself.
            ctx.fillStyle = '#a96867'; ctx.beginPath(); ctx.arc(W / 2, 34, 7, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#f1d8b0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, 33); ctx.stroke();
            for (const [x, y] of [[29, 27], [W - 29, 27], [29, H - 27], [W - 29, H - 27]]) {
                ctx.fillStyle = '#f2d7a0'; ctx.beginPath();
                ctx.moveTo(x, y - 6); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 4, y); ctx.fill();
            }
            ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#292b37'; ctx.fillStyle = '#292b37';
            strokes.forEach(stroke => {
                const points = stroke.points;
                if (points.length === 1) {
                    ctx.beginPath(); ctx.arc(points[0].x, points[0].y, stroke.size * points[0].pressure / 2, 0, Math.PI * 2); ctx.fill(); return;
                }
                for (let i = 1; i < points.length; i++) {
                    const a = points[i - 1], b = points[i];
                    ctx.lineWidth = stroke.size * (0.5 + (a.pressure + b.pressure) / 2 * 0.7);
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                }
            });
        };
        refresh();
        // Open directly onto the paper, with no start card, HUD or pause screen.
        invalidate();
        canvas.focus({ preventScroll: true });
    }
};
