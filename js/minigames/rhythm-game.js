const RhythmGameMethods = {
    startRhythmGame(targetSuccess, targetFail) {
        this.setGameState(GameState.MINIGAME);
        const scope = this.beginActivity();
        this.stopAllSoundEffects();
        const container = document.getElementById('rhythm-game-container');
        const canvas = document.getElementById('rhythm-canvas'), ctx = canvas.getContext('2d');
        const kit = ArcadeKit, t = kit.text;
        const ui = kit.create(this, scope, container, canvas, 'rhythm');
        const W = ui.width, H = ui.height, beat = 60000 / 104;
        const top = 60, judgment = H - 118, travel = 1850, trackX = 312, trackWidth = 600, laneGap = 14;
        const laneWidth = (trackWidth - laneGap * 2) / 3, laneColors = ['#d887a3', '#7299bf', '#a28cbd'];
        const keys = ['A', 'S', 'D'];
        const rivalName = this.characterName(GameConfig.minigames.rhythm.opponent);
        const rivalPortrait = new Image();
        const portraitUrl = GameConfig.characters[GameConfig.minigames.rhythm.opponent]?.icon;
        if (portraitUrl) rivalPortrait.src = portraitUrl;
        let lastPhase = null, resultCleared = false;
        ui.shell.querySelector('.arcade-heading .arcade-eyebrow').textContent = t('rhythmEyebrow');
        ui.onCard = card => {
            container.dataset.rhythmPhase = ui.phase;
            const seal = kit.element('span', 'rhythm-card-seal', '♡');
            seal.setAttribute('aria-hidden', 'true');
            card.prepend(kit.element('span', 'rhythm-card-eyebrow', t('rhythmEyebrow')), seal);
            if (ui.phase === 'intro') {
                card.querySelector('h3').textContent = t('rhythmReady');
                card.querySelector('.arcade-card-actions button').textContent = t('rhythmStart');
            } else if (ui.phase === 'ended') {
                card.querySelector('h3').textContent = t(resultCleared ? 'rhythmResultWin' : 'rhythmResultLose');
                card.classList.add('rhythm-result-card');
                seal.textContent = resultCleared ? '♥' : '♡';
            }
        };
        scope.defer(() => { delete container.dataset.rhythmPhase; });
        // Authored, repeatable chart with a gentle half-beat near the end.
        const pattern = [0, 1, 2, 1, 0, 2, 1, 0, 1, 2];
        const positions = [4, 5, 6, 7, 8, 9, 10, 11.5, 13, 14];
        const melody = [392, 440, 523.25, 440, 392, 523.25, 493.88, 392, 440, 523.25];
        const notes = pattern.map((lane, index) => ({ lane, at: positions[index] * beat, state: 'pending', sounded: false, frequency: melody[index] }));
        const flashes = [0, 0, 0], lastPress = [-1000, -1000, -1000];
        const sparks = [];
        let time = 0, hits = 0, combo = 0, bestCombo = 0, score = 0, weight = 0, strays = 0;
        let perfects = 0, greats = 0, goods = 0, misses = 0, lastBeat = -1, lastJudgment = '—';
        const hitWindow = () => ui.relaxed ? 275 : 215;
        const accuracy = () => Math.round(weight / notes.length * 100);
        const refresh = () => {
            ui.stat('notes', t('notes'), hits + ' / 10');
            ui.stat('combo', t('combo'), combo);
            ui.stat('score', t('score'), score);
            ui.stat('accuracy', t('accuracy'), accuracy() + '%');
            ui.stat('timing', t('timing'), lastJudgment);
        };
        const missNote = note => {
            note.state = 'miss'; combo = 0; misses++; lastJudgment = 'MISS';
            ui.notify(t('miss'), 'bad', 420);
        };
        const finish = () => {
            const win = hits >= (ui.relaxed ? 7 : 8);
            resultCleared = win;
            if (win) AchievementManager.unlock('rhythm_win');
            const details = [
                t('score') + ': ' + score + ' / 10000',
                t('accuracy') + ': ' + accuracy() + '% · ' + t('bestCombo') + ': ' + bestCombo,
                'PERFECT ' + perfects + ' · GREAT ' + greats + ' · GOOD ' + goods + ' · MISS ' + misses
            ];
            if (hits === notes.length && strays === 0) details.unshift(t('fullCombo'));
            ui.result(win, t(win ? 'rhythmWin' : 'rhythmLose'), details,
                () => { ui.close(); this.startRhythmGame(targetSuccess, targetFail); },
                () => { ui.close(); this.loadScene(win ? targetSuccess : targetFail); });
        };
        const press = action => {
            const lane = Number(action);
            if (!Number.isInteger(lane) || time - lastPress[lane] < 75) return;
            lastPress[lane] = time; flashes[lane] = 140;
            const nearby = notes.filter(note => note.state === 'pending' && note.lane === lane)
                .sort((a, b) => Math.abs(a.at - time) - Math.abs(b.at - time))[0];
            if (!nearby || Math.abs(time - nearby.at) > hitWindow()) {
                // Early taps give feedback but never consume an upcoming note.
                strays++; combo = 0; score = Math.max(0, score - 50);
                lastJudgment = nearby && time < nearby.at ? t('early') : t('late');
                ui.notify(lastJudgment, 'bad', 280); ui.tone(155, 0.035, 0.035, 'triangle'); refresh();
                return;
            }
            const offset = time - nearby.at, delta = Math.abs(offset);
            const grade = delta <= 90 ? 'PERFECT' : delta <= (ui.relaxed ? 185 : 155) ? 'GREAT' : 'GOOD';
            const points = grade === 'PERFECT' ? 1000 : grade === 'GREAT' ? 800 : 550;
            nearby.state = 'hit'; hits++; combo++; bestCombo = Math.max(bestCombo, combo);
            score += points; weight += points / 1000;
            if (grade === 'PERFECT') perfects++; else if (grade === 'GREAT') greats++; else goods++;
            lastJudgment = grade;
            ui.notify(grade + (grade === 'PERFECT' ? '' : ' · ' + t(offset < 0 ? 'early' : 'late')), 'good', 440);
            ui.tone(nearby.frequency * 2, 0.07, 0.06, 'sine'); flashes[lane] = 230;
            if (!ui.reducedMotion) for (let i = 0; i < 8; i++) sparks.push({
                x: trackX + lane * (laneWidth + laneGap) + laneWidth / 2, y: judgment,
                vx: (i - 3.5) * 35, vy: -65 - (i % 3) * 32, life: 330, color: laneColors[lane]
            });
            refresh();
        };
        ui.bindControls([
            { id: '0', label: 'rhythmLaneA', key: 'A', icon: 'a', codes: ['KeyA'] },
            { id: '1', label: 'rhythmLaneS', key: 'S', icon: 's', codes: ['KeyS'] },
            { id: '2', label: 'rhythmLaneD', key: 'D', icon: 'd', codes: ['KeyD'] }
        ], press);
        const controlButtons = [...ui.footer.querySelectorAll('.arcade-control')];
        controlButtons.forEach((button, index) => {
            const key = kit.element('span', 'rhythm-key-letter', keys[index]);
            key.setAttribute('aria-hidden', 'true');
            button.replaceChildren(key, kit.element('span', 'rhythm-key-caption', t(['rhythmLaneA', 'rhythmLaneS', 'rhythmLaneD'][index])));
            button.dataset.lane = String(index);
        });
        ui.onLayout = rect => {
            const shellRect = ui.shell.getBoundingClientRect();
            if (!rect.width || !rect.height || !shellRect.width || !ui.shell.offsetWidth) return;
            const contentScale = Math.min(rect.width / W, rect.height / H);
            const shellScale = shellRect.width / ui.shell.offsetWidth;
            const contentLeft = rect.left + (rect.width - W * contentScale) / 2;
            const contentTop = rect.top + (rect.height - H * contentScale) / 2;
            const stageRect = ui.stage.getBoundingClientRect();
            // Keep the three touch keys directly below the fitted lanes, even with letterboxing.
            const left = (contentLeft + trackX * contentScale - shellRect.left) / shellScale;
            const right = (shellRect.right - contentLeft - (trackX + trackWidth) * contentScale) / shellScale;
            ui.footer.style.setProperty('--rhythm-control-left', Math.max(24, left) + 'px');
            ui.footer.style.setProperty('--rhythm-control-right', Math.max(24, right) + 'px');
            ui.stage.style.setProperty('--rhythm-feedback-left',
                (contentLeft + (trackX + trackWidth / 2) * contentScale - stageRect.left) / shellScale + 'px');
            ui.stage.style.setProperty('--rhythm-feedback-top',
                (contentTop + (judgment - 52) * contentScale - stageRect.top) / shellScale + 'px');
            ui.stage.style.setProperty('--rhythm-countdown-top',
                (contentTop + H * 0.34 * contentScale - stageRect.top) / shellScale + 'px');
        };
        scope.listen(canvas, 'pointerdown', event => {
            if (ui.phase !== 'playing' || event.button !== 0) return;
            const rect = canvas.getBoundingClientRect();
            const scale = Math.min(rect.width / W, rect.height / H);
            const x = (event.clientX - rect.left - (rect.width - W * scale) / 2) / scale;
            const lane = Math.floor((x - trackX) / (laneWidth + laneGap));
            if (lane < 0 || lane > 2 || x > trackX + trackWidth) return;
            event.preventDefault(); canvas.focus({ preventScroll: true }); press(String(lane));
        });
        const soundHint = kit.element('p', 'arcade-footnote', t('soundHint'));
        ui.footer.append(soundHint);
        const update = step => {
            time += step;
            const thisBeat = Math.floor(time / beat);
            if (thisBeat !== lastBeat) {
                lastBeat = thisBeat;
                ui.tone(thisBeat % 4 === 0 ? 220 : 330, 0.045, thisBeat % 4 === 0 ? 0.10 : 0.045, 'triangle');
                if (thisBeat % 4 === 0) ui.tone(thisBeat < 8 ? 196 : 261.63, 0.32, 0.045, 'sine');
            }
            notes.forEach(note => {
                // Melody follows the chart even on a miss; hit feedback is a higher overtone.
                if (!note.sounded && time >= note.at) { note.sounded = true; ui.tone(note.frequency, 0.18, 0.09); }
                if (note.state === 'pending' && time - note.at > hitWindow()) missNote(note);
            });
            flashes.forEach((value, index) => { flashes[index] = Math.max(0, value - step); });
            for (let i = sparks.length - 1; i >= 0; i--) {
                const p = sparks[i]; p.life -= step; p.x += p.vx * step / 1000; p.y += p.vy * step / 1000;
                if (p.life <= 0) sparks.splice(i, 1);
            }
            refresh();
            if (time >= notes[notes.length - 1].at + hitWindow() + 600) finish();
        };
        const heart = (x, y, size, fill, stroke = null) => {
            ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
            ctx.beginPath(); ctx.moveTo(0, 0.45);
            ctx.bezierCurveTo(-0.86, -0.08, -0.48, -0.8, 0, -0.31);
            ctx.bezierCurveTo(0.48, -0.8, 0.86, -0.08, 0, 0.45); ctx.closePath();
            if (fill) { ctx.fillStyle = fill; ctx.fill(); }
            if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5 / size; ctx.stroke(); }
            ctx.restore();
        };
        const promiseLines = () => {
            const words = RuntimeState.language === 'en' ? t('rhythmPromise').match(/\S+\s*/g) : [...t('rhythmPromise')];
            const lines = []; let line = '';
            for (const word of words) {
                if (line && ctx.measureText(line + word).width > 210) { lines.push(line.trim()); line = word; }
                else line += word;
            }
            if (line) lines.push(line.trim());
            return lines.slice(0, 2);
        };
        const draw = () => {
            if (lastPhase !== ui.phase) {
                lastPhase = ui.phase; container.dataset.rhythmPhase = ui.phase;
                controlButtons.forEach(button => { button.disabled = ui.phase !== 'playing'; });
            }
            const bg = ctx.createLinearGradient(0, 0, W, H);
            bg.addColorStop(0, '#fff8fa'); bg.addColorStop(0.55, '#fcf9fd'); bg.addColorStop(1, '#eef4fb');
            ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
            // Stationery-like details stay still; only notes, timing cues and hit petals move.
            ctx.fillStyle = '#dac6d926';
            for (let y = 14; y < H; y += 24) for (let x = 14; x < W; x += 24) {
                ctx.beginPath(); ctx.arc(x, y, 0.8, 0, Math.PI * 2); ctx.fill();
            }
            ctx.fillStyle = '#f3dfe86b'; ctx.beginPath(); ctx.ellipse(15, 24, 95, 36, -0.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#dfeaf480'; ctx.beginPath(); ctx.ellipse(W + 3, H - 16, 102, 40, -0.5, 0, Math.PI * 2); ctx.fill();

            // The familiar character is the session's cover, not an unrelated record graphic.
            kit.rounded(ctx, 32, 32, 246, H - 53, 22, '#e5dbe655');
            kit.rounded(ctx, 28, 27, 246, H - 53, 22, '#fffdfd');
            ctx.strokeStyle = '#eadde7'; ctx.lineWidth = 1; ctx.stroke();
            ctx.textAlign = 'center'; ctx.font = '500 13px "Noto Sans SC", "Yu Gothic", Arial, sans-serif';
            ctx.fillStyle = '#87758c'; ctx.fillText(t('rhythmRival'), 151, 62);
            ctx.save(); ctx.beginPath(); ctx.arc(151, 190, 106, 0, Math.PI * 2); ctx.clip();
            const cover = ctx.createLinearGradient(45, 84, 253, 296);
            cover.addColorStop(0, '#d7eaf4'); cover.addColorStop(1, '#ece1f5');
            ctx.fillStyle = cover; ctx.fillRect(45, 84, 212, 212);
            if (rivalPortrait.complete && rivalPortrait.naturalWidth > 0) ctx.drawImage(rivalPortrait, 45, 84, 212, 212);
            else heart(151, 186, 70, '#b3bddb', '#ffffff');
            ctx.restore();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(151, 190, 106, 0, Math.PI * 2); ctx.stroke();
            // Paper tape, a small name tag, and a rose-colored heart tie the cover to the novel.
            ctx.save(); ctx.translate(64, 92); ctx.rotate(-0.22);
            kit.rounded(ctx, -26, -8, 55, 16, 2, '#f3e5b9c4'); ctx.restore();
            kit.rounded(ctx, 96, 279, 110, 29, 14, '#fffdfd');
            ctx.fillStyle = '#607b9b'; ctx.font = '600 15px "Noto Sans SC", "Yu Gothic", Arial, sans-serif';
            ctx.fillText(rivalName, 151, 299, 100);
            heart(237, 305, 23, '#eaa7bd', '#fffdfd');
            ctx.fillStyle = '#586f91'; ctx.font = '700 23px "Noto Serif SC", "Yu Mincho", Georgia, serif';
            ctx.fillText(t('rhythmTrack'), 151, 341, 215);
            ctx.fillStyle = '#a08496'; ctx.font = '500 12px Arial, sans-serif'; ctx.fillText('104 BPM', 151, 363);
            ctx.font = '13px "Noto Sans SC", "Yu Gothic", Arial, sans-serif'; ctx.fillStyle = '#8b7c8b';
            promiseLines().forEach((line, index) => ctx.fillText(line, 151, 388 + index * 19));
            ctx.strokeStyle = '#eadce4'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(55, 423); ctx.lineTo(247, 423); ctx.stroke();
            heart(95, 467, 40, '#f7d9e4');
            ctx.font = '500 12px "Noto Sans SC", "Yu Gothic", Arial, sans-serif'; ctx.fillStyle = '#9a7a8c'; ctx.fillText(t('rhythmLink'), 179, 447);
            ctx.font = '600 38px Arial, sans-serif'; ctx.fillStyle = combo ? '#c27896' : '#b8a4b1';
            ctx.fillText(String(combo).padStart(2, '0'), 179, 490);

            // Wide, ribbon-like lanes leave the falling notes room to breathe.
            kit.rounded(ctx, trackX - 14, 18, trackWidth + 28, H - 31, 24, '#ffffffc9');
            ctx.strokeStyle = '#e5dce9'; ctx.lineWidth = 1; ctx.stroke();
            const tint = ['#fbeaf0', '#eaf2fa', '#f2ecf8'];
            for (let lane = 0; lane < 3; lane++) {
                const x = trackX + lane * (laneWidth + laneGap);
                const strip = ctx.createLinearGradient(x, top, x, judgment + 80);
                strip.addColorStop(0, '#fffdfd'); strip.addColorStop(1, tint[lane]);
                kit.rounded(ctx, x, top, laneWidth, H - top - 44, 16, strip);
                ctx.strokeStyle = lane === 0 ? '#edd6e0' : lane === 1 ? '#d6e2ef' : '#e3d9ed'; ctx.lineWidth = 1; ctx.stroke();
                ctx.fillStyle = laneColors[lane]; ctx.font = '600 17px Arial, sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(keys[lane], x + laneWidth / 2, 45);
                ctx.save(); ctx.beginPath(); ctx.rect(x + 1, top, laneWidth - 2, judgment - top + 26); ctx.clip();
                for (let b = 0; b <= 18; b++) {
                    const y = judgment - (b * beat - time) / travel * (judgment - top);
                    if (y < top || y > judgment + 24) continue;
                    ctx.strokeStyle = b % 4 === 0 ? '#c8b4cb65' : '#c8b4cb2c'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(x + laneWidth - 12, y); ctx.stroke();
                }
                notes.forEach(note => {
                    if (note.lane !== lane || note.state === 'hit') return;
                    const y = judgment - (note.at - time) / travel * (judgment - top);
                    if (y < top - 24 || y > judgment + 25) return;
                    const color = note.state === 'miss' ? '#b8adb9' : laneColors[lane];
                    kit.rounded(ctx, x + 15, y - 14, laneWidth - 30, 28, 14, color);
                    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
                    kit.rounded(ctx, x + 30, y - 10, laneWidth - 60, 2, 1, '#ffffff55');
                    ctx.fillStyle = '#ffffff'; ctx.font = '600 13px Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(keys[lane], x + 28, y + 5);
                    heart(x + laneWidth / 2, y, 14, '#ffffff');
                });
                ctx.restore();
                const pressed = flashes[lane] > 0 || ui.held[String(lane)];
                if (pressed) {
                    ctx.globalAlpha = 0.1 + flashes[lane] / 1500; ctx.fillStyle = laneColors[lane];
                    ctx.fillRect(x + 2, judgment - 24, laneWidth - 4, 55); ctx.globalAlpha = 1;
                }
                ctx.strokeStyle = '#d692ab'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(x + 1, judgment); ctx.lineTo(x + laneWidth - 1, judgment); ctx.stroke();
                ctx.fillStyle = pressed ? '#f6d2df' : '#fffafb'; ctx.beginPath(); ctx.arc(x + laneWidth / 2, judgment, 18, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#e2a0b7'; ctx.lineWidth = 2; ctx.stroke();
                heart(x + laneWidth / 2, judgment, 21, '#cc7898');
                kit.rounded(ctx, x + laneWidth / 2 - 28, judgment + 32, 56, 44, 13, '#dccbd740');
                kit.rounded(ctx, x + laneWidth / 2 - 28, judgment + 29, 56, 44, 13, pressed ? tint[lane] : '#ffffff');
                ctx.strokeStyle = '#decfdf'; ctx.lineWidth = 1; ctx.stroke();
                ctx.fillStyle = laneColors[lane]; ctx.font = '600 24px Arial, sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(keys[lane], x + laneWidth / 2, judgment + 60);
            }
            sparks.forEach(p => { ctx.globalAlpha = p.life / 330; heart(p.x, p.y, 7, p.color); }); ctx.globalAlpha = 1;
            const center = trackX + trackWidth / 2;
            for (let i = 0; i < 4; i++) {
                const active = lastBeat >= 0 && lastBeat % 4 === i && ui.phase === 'playing';
                heart(center - 42 + i * 28, H - 16, 11, active ? '#c77e9a' : '#f1e4ed', active ? null : '#d7bfcf');
            }
        };
        refresh();
        ui.intro(() => ui.duckBgm(), { steps: [t('rhythmStep1'), t('rhythmStep2'), t('rhythmStep3')] });
        ui.modal.querySelectorAll('.arcade-modes button').forEach((button, index) => {
            button.textContent = t(index === 0 ? 'rhythmStandard' : 'rhythmRelaxed');
        });
        ui.loop(update, draw);
    }
};
