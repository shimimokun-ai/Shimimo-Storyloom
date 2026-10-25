const DodgeballGameMethods = {
    startDodgeballGame() {
        this.setGameState(GameState.MINIGAME);
        const scope = this.beginActivity();
        this.isDodgeballActive = true;
        scope.defer(() => { this.isDodgeballActive = false; });
        this.stopAllSoundEffects();
        const container = document.getElementById('dodgeball-game-container');
        const canvas = document.getElementById('dodgeball-canvas'), ctx = canvas.getContext('2d');
        const kit = ArcadeKit, t = kit.text;
        const ui = kit.create(this, scope, container, canvas, 'snow');
        const W = ui.width, H = ui.height, duration = 10000, horizon = 136, riderZ = 0.79;
        const art = kit.loadImages(scope, GameConfig.minigames.dodgeball.sprites || {});
        const player = { lateral: 0, vx: 0, lean: 0, hearts: ui.relaxed ? 4 : 3,
            protection: 0, jump: 0, cooldown: 0, speed: 1 };
        let time = 0, distance = 0, nextRow = 900, rowCount = 0, grazes = 0, gates = 0, jumps = 0, nextTrack = 0;
        const obstacles = [], tracks = [], powder = [];
        const heading = ui.shell.querySelector('.arcade-heading');
        heading.querySelector('.arcade-eyebrow').textContent = t('snowEyebrow');
        const portrait = kit.element('img', 'snow-rider-portrait');
        const rider = GameConfig.characters[GameConfig.minigames.dodgeball.player];
        if (rider?.icon) portrait.src = rider.icon; else portrait.hidden = true;
        portrait.alt = '';
        const riderCard = kit.element('div', 'snow-rider-card');
        riderCard.append(portrait, kit.element('span', '', this.characterName(GameConfig.minigames.dodgeball.player)));
        ui.shell.querySelector('.arcade-hud').prepend(riderCard);
        const course = kit.element('div', 'snow-course');
        const courseLabel = kit.element('span', '', t('skiProgress'));
        const progress = kit.element('progress', 'snow-course-meter');
        progress.max = duration; progress.value = 0;
        progress.setAttribute('aria-label', t('skiProgress'));
        const remaining = kit.element('span', 'snow-course-time', '10.0 s');
        course.append(courseLabel, progress, remaining); ui.stage.append(course);
        ui.footer.append(kit.element('p', 'arcade-footnote', t('skiHint')));
        const syncArtCard = () => {
            if (ui.phase !== 'intro') return;
            const card = ui.modal.querySelector('.arcade-card');
            if (!card) return;
            card.querySelector('.arcade-card-actions button').disabled = !art.ready;
            const status = card.querySelector('.arcade-art-status');
            if (status) { status.textContent = t(art.failed ? 'artLoadError' : 'artLoading'); status.hidden = art.ready; }
            if (art.failed && !card.querySelector('.snow-art-retry')) {
                card.querySelector('.arcade-card-actions').append(kit.button(t('retry'), () => {
                    ui.close(); this.startDodgeballGame();
                }, 'snow-art-retry'));
            }
        };
        ui.onCard = card => {
            card.prepend(kit.element('span', 'snow-card-label', t('snowEyebrow')));
            if (ui.phase === 'intro') card.append(kit.element('p', 'arcade-art-status'));
            syncArtCard();
        };
        art.onChange = syncArtCard;
        const refresh = () => {
            const hearts = ui.relaxed ? 4 : 3;
            ui.stat('health', t('health'), '♥'.repeat(Math.max(0, player.hearts)) + '♡'.repeat(Math.max(0, hearts - player.hearts)));
            ui.stat('speed', t('skiSpeed'), Math.round(player.speed * 38) + ' km/h');
            ui.stat('jump', t('skiJump'), player.cooldown > 0 ? (player.cooldown / 1000).toFixed(1) + ' s' : t('ready'));
            progress.value = time;
            remaining.textContent = Math.max(0, (duration - time) / 1000).toFixed(1) + ' s';
        };
        const finish = win => {
            if (win) AchievementManager.unlock('dodgeball_win');
            ui.result(win, t(win ? 'snowWin' : 'snowLose'), [
                t('time') + ': ' + (time / 1000).toFixed(1) + ' / 10 s',
                t('skiDistance') + ': ' + Math.round(distance) + ' m',
                t('skiGates') + ': ' + gates + ' · ' + t('grazes') + ': ' + grazes,
                t('skiJump') + ': ' + jumps
            ], () => { ui.close(); this.startDodgeballGame(); }, () => {
                ui.close(); this.setGameState(GameState.DIALOGUE); this.currentIndex++; this.processCommand();
            });
        };
        ui.bindControls([
            { id: 'left', label: 'left', key: 'A / ←', icon: 'a', codes: ['KeyA', 'ArrowLeft'] },
            { id: 'brake', label: 'skiBrake', key: 'S / ↓', icon: 's', codes: ['KeyS', 'ArrowDown'] },
            { id: 'tuck', label: 'skiTuck', key: 'W / ↑', icon: 'w', codes: ['KeyW', 'ArrowUp'] },
            { id: 'right', label: 'right', key: 'D / →', icon: 'd', codes: ['KeyD', 'ArrowRight'] },
            { id: 'hop', label: 'skiJump', key: 'Space / Shift', icon: 'space', codes: ['Space', 'ShiftLeft', 'ShiftRight'] }
        ], action => {
            if (action !== 'hop' || player.cooldown > 0) return;
            player.jump = 330; player.cooldown = ui.relaxed ? 1050 : 1450; jumps++;
            ui.tone(640, 0.055, 0.055, 'triangle');
        });
        const centerAt = z => W / 2 + Math.sin(distance / 175) * (z - riderZ) * 115;
        const project = (lateral, z) => ({
            x: centerAt(z) + lateral * (42 + z * 380),
            y: horizon + z * z * (H - horizon + 40),
            scale: 0.25 + z * 1.3
        });
        const spray = (x, y, color = '#fffaf5') => {
            if (ui.reducedMotion) return;
            for (let i = 0; i < 7; i++) powder.push({
                x, y, vx: (i - 3) * 26, vy: 20 + i * 9, life: 360, color
            });
        };
        const spawnRow = () => {
            rowCount++;
            const lanes = [-0.64, 0, 0.64];
            const first = Math.floor(Math.random() * 3);
            const count = !ui.relaxed && time > 4800 ? 2 : 1;
            const occupied = [first];
            if (count === 2) occupied.push((first + 1) % 3);
            // Each row leaves a full lane open. Obstacles never home in on a skier.
            for (const lane of occupied) obstacles.push({
                kind: rowCount % 3 === 0 ? 'rock' : 'snowball', lateral: lanes[lane],
                z: 0.08, resolved: false, radius: rowCount % 3 === 0 ? 0.10 : 0.075
            });
            if (rowCount % 2 === 0) {
                const free = lanes.find((_, index) => !occupied.includes(index));
                obstacles.push({ kind: 'gate', lateral: free, z: 0.08, resolved: false });
            }
        };
        const update = step => {
            const dt = step / 1000;
            time = Math.min(duration, time + step);
            const steer = Number(Boolean(ui.held.right)) - Number(Boolean(ui.held.left));
            const targetSpeed = (ui.held.brake ? 0.55 : ui.held.tuck ? 1.24 : 1) * (1 + time / duration * 0.15);
            player.speed += (targetSpeed - player.speed) * Math.min(1, dt * 4.5);
            player.vx = (player.vx + steer * 7 * dt) * Math.exp(-4 * dt);
            player.lateral = kit.clamp(player.lateral + player.vx * dt, -0.85, 0.85);
            if (Math.abs(player.lateral) >= 0.85 && Math.sign(player.vx) === Math.sign(player.lateral)) player.vx = 0;
            player.lean += (steer * 0.20 - player.lean) * Math.min(1, dt * 9);
            player.cooldown = Math.max(0, player.cooldown - step);
            player.protection = Math.max(0, player.protection - step);
            player.jump = Math.max(0, player.jump - step);
            const travelled = player.speed * 38 / 3.6 * dt;
            distance += travelled;
            if (time >= nextTrack && player.jump === 0) {
                tracks.push({ lateral: player.lateral, distance });
                nextTrack = time + 75;
            }
            while (tracks.length && distance - tracks[0].distance > 9) tracks.shift();
            if (time >= nextRow && time < 7500) {
                spawnRow();
                nextRow = time + (ui.relaxed ? 1.22 : 1) * (1150 - time / duration * 360);
            }
            const advance = player.speed * (ui.relaxed ? 0.39 : 0.46) * dt;
            for (let i = obstacles.length - 1; i >= 0; i--) {
                const obstacle = obstacles[i], previousZ = obstacle.z;
                obstacle.z += advance;
                if (obstacle.z > 1.2) { obstacles.splice(i, 1); continue; }
                // Sweep across the contact plane so acceleration cannot skip a collision.
                if (!obstacle.resolved && previousZ <= riderZ && obstacle.z >= riderZ) {
                    obstacle.resolved = true;
                    const separation = Math.abs(player.lateral - obstacle.lateral);
                    const p = project(player.lateral, riderZ);
                    if (obstacle.kind === 'gate') {
                        if (separation < 0.24) {
                            gates++; ui.notify(t('skiGates') + ' +1', 'good', 420);
                            spray(p.x, p.y - 30, '#b8e1d2'); ui.tone(880, 0.045, 0.035);
                        }
                    } else if (separation < obstacle.radius + 0.045 && player.protection === 0 && player.jump === 0) {
                        player.hearts--; player.protection = 1150; player.speed *= 0.7;
                        spray(p.x, p.y - 25, '#e5b0bb');
                        ui.notify(t('health') + ' −1', 'bad', 550); ui.tone(180, 0.09, 0.07, 'triangle');
                        obstacles.splice(i, 1);
                        if (player.hearts <= 0) { refresh(); finish(false); return; }
                    } else if (separation >= obstacle.radius + 0.045 && separation < obstacle.radius + 0.125
                        && player.protection === 0 && player.jump === 0) {
                        grazes++; ui.notify(t('grazes') + ' +1', 'good', 380);
                        spray(p.x, p.y - 15); ui.tone(760, 0.035, 0.035);
                    }
                }
            }
            for (let i = powder.length - 1; i >= 0; i--) {
                const p = powder[i]; p.life -= step; p.x += p.vx * dt; p.y += p.vy * dt;
                if (p.life <= 0) powder.splice(i, 1);
            }
            refresh();
            if (time >= duration) finish(true);
        };
        const drawSkier = () => {
            const p = project(player.lateral, riderZ);
            const lift = player.jump > 0 ? Math.sin(player.jump / 330 * Math.PI) * 27 : 0;
            ctx.fillStyle = '#7ca6b52b'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 5, 28, 9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.save(); ctx.translate(p.x, p.y - lift); ctx.rotate(player.lean);
            const brake = Boolean(ui.held.brake) && ui.phase === 'playing';
            for (const side of [-1, 1]) {
                ctx.save(); ctx.translate(side * 13, -8); ctx.rotate(brake ? side * -0.22 : side * 0.025);
                kit.rounded(ctx, -4, -26, 8, 70, 4, '#dd96a8');
                kit.rounded(ctx, -2, -23, 4, 57, 2, '#ffe9e5');
                ctx.restore();
                ctx.strokeStyle = '#49667d'; ctx.lineWidth = 7; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(side * 8, -34); ctx.lineTo(side * 13, 7); ctx.stroke();
                ctx.strokeStyle = '#aec1c8'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(side * 25, -37); ctx.lineTo(side * 36, 20); ctx.stroke();
                ctx.beginPath(); ctx.ellipse(side * 36, 20, 5, 2, 0, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.fillStyle = '#accbd7';
            ctx.beginPath(); ctx.moveTo(-14, -63); ctx.quadraticCurveTo(-23, -49, -16, -27);
            ctx.lineTo(16, -27); ctx.quadraticCurveTo(23, -49, 14, -63); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#85aabf'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-14, -55); ctx.lineTo(-25, -38); ctx.moveTo(14, -55); ctx.lineTo(25, -38); ctx.stroke();
            ctx.fillStyle = '#4a657f';
            for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * 25, -37, 5, 0, Math.PI * 2); ctx.fill(); }
            ctx.fillStyle = '#e6a8b6'; ctx.beginPath(); ctx.moveTo(-11, -66);
            ctx.lineTo(12, -66); ctx.lineTo(22 + player.lean * 40, -50); ctx.lineTo(14, -47); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#d898a9'; ctx.beginPath(); ctx.ellipse(0, -74, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff2e3'; ctx.beginPath(); ctx.arc(0, -79, 13, Math.PI, 0); ctx.fill();
            kit.rounded(ctx, -14, -80, 28, 7, 3, '#f9e1d3');
            ctx.fillStyle = '#fff8ed'; ctx.beginPath(); ctx.arc(0, -94, 5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#f4d4d6'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-7, -68); ctx.lineTo(-6, -59); ctx.moveTo(7, -68); ctx.lineTo(6, -59); ctx.stroke();
            if (player.protection > 0) {
                ctx.strokeStyle = '#cc8193'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.ellipse(0, -41, 32, 54, 0, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.restore();
        };
        const drawObstacle = obstacle => {
            const p = project(obstacle.lateral, obstacle.z);
            if (obstacle.kind === 'gate') {
                const width = (42 + obstacle.z * 380) * 0.25;
                const height = 48 * p.scale;
                ctx.strokeStyle = '#759a9b'; ctx.lineWidth = Math.max(1, p.scale * 2);
                for (const side of [-1, 1]) {
                    const x = p.x + side * width;
                    ctx.beginPath(); ctx.moveTo(x, p.y); ctx.lineTo(x, p.y - height); ctx.stroke();
                    ctx.fillStyle = '#8bc8b3'; ctx.fillRect(x, p.y - height, side * 21 * p.scale, 16 * p.scale);
                }
                return;
            }
            const r = (obstacle.kind === 'rock' ? 21 : 19) * p.scale;
            ctx.fillStyle = '#729ca62b'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 3, r, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
            const image = art.images[obstacle.kind];
            if (image?.complete && image.naturalWidth) ctx.drawImage(image, p.x - r, p.y - r * 1.85, r * 2, r * 2);
            if (!image?.naturalWidth) {
                ctx.fillStyle = obstacle.kind === 'rock' ? '#7b8393' : '#f8fcff';
                ctx.beginPath(); ctx.ellipse(p.x, p.y - r, r, r, 0, 0, Math.PI * 2); ctx.fill();
            }
            if (!obstacle.resolved) {
                ctx.strokeStyle = '#9e7e66'; ctx.lineWidth = Math.max(1, p.scale * 1.5);
                ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.12, r * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
                if (obstacle.z < 0.27) {
                    ctx.fillStyle = '#a67451'; ctx.beginPath(); ctx.moveTo(p.x, p.y - r * 2.5);
                    ctx.lineTo(p.x - 4, p.y - r * 2.5 - 7); ctx.lineTo(p.x + 4, p.y - r * 2.5 - 7); ctx.fill();
                }
            }
        };
        const draw = () => {
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#c8e2e9'); bg.addColorStop(0.28, '#e6f1f1'); bg.addColorStop(1, '#f7f2ed');
            ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#fff5da'; ctx.beginPath(); ctx.arc(W - 147, 63, 24, 0, Math.PI * 2); ctx.fill();
            for (let layer = 0; layer < 2; layer++) {
                ctx.fillStyle = layer ? '#d1e2e7' : '#bacfdc';
                ctx.beginPath(); ctx.moveTo(0, horizon + 30);
                for (let i = 0; i <= 8; i++) ctx.lineTo(i * 135 - 20, 66 + Math.sin(i * 2.1 + layer) * 47 + layer * 27);
                ctx.lineTo(W, horizon + 30); ctx.closePath(); ctx.fill();
            }
            // The piste bends into the horizon. All objects share this same projection.
            ctx.fillStyle = '#fbfcf8'; ctx.beginPath();
            const top = project(-1, 0), bottom = project(1, 1.1);
            ctx.moveTo(top.x, top.y);
            for (let z = 0; z <= 1.12; z += 0.04) { const p = project(-1, z); ctx.lineTo(p.x, p.y); }
            ctx.lineTo(bottom.x, bottom.y);
            for (let z = 1.12; z >= 0; z -= 0.04) { const p = project(1, z); ctx.lineTo(p.x, p.y); }
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#c3dce3'; ctx.lineWidth = 2;
            for (const side of [-1, 1]) {
                ctx.beginPath();
                for (let z = 0; z <= 1.12; z += 0.04) { const p = project(side, z); if (z === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }
                ctx.stroke();
            }
            for (let i = 0; i < 18; i++) {
                const z = 0.06 + (i / 9 + distance / 21) % 1.14;
                const side = i % 2 ? 1 : -1, p = project(side * (1.10 + (i % 3) * 0.08), z);
                const size = 28 + z * 62;
                if (art.images.pine?.complete && art.images.pine.naturalWidth) {
                    ctx.drawImage(art.images.pine, p.x - size / 2, p.y - size, size, size);
                    ctx.fillStyle = '#fffaf1'; ctx.beginPath(); ctx.moveTo(p.x, p.y - size);
                    ctx.lineTo(p.x - size * 0.14, p.y - size * 0.76); ctx.lineTo(p.x + size * 0.14, p.y - size * 0.76); ctx.fill();
                } else {
                    ctx.fillStyle = '#648c84'; ctx.beginPath(); ctx.moveTo(p.x, p.y - size);
                    ctx.lineTo(p.x - size * 0.34, p.y); ctx.lineTo(p.x + size * 0.34, p.y); ctx.closePath(); ctx.fill();
                }
            }
            ctx.strokeStyle = '#a4c6d380'; ctx.lineWidth = 2;
            for (const track of tracks) {
                const z = riderZ + (distance - track.distance) / 24;
                const p = project(track.lateral, z);
                ctx.beginPath(); ctx.moveTo(p.x - 10 * p.scale, p.y); ctx.lineTo(p.x - 10 * p.scale, p.y + 13 * p.scale);
                ctx.moveTo(p.x + 10 * p.scale, p.y); ctx.lineTo(p.x + 10 * p.scale, p.y + 13 * p.scale); ctx.stroke();
            }
            // Essential forward motion remains visible with reduced-motion enabled.
            const ordered = [...obstacles].sort((a, b) => a.z - b.z);
            ordered.filter(obstacle => obstacle.z <= riderZ).forEach(drawObstacle);
            drawSkier();
            ordered.filter(obstacle => obstacle.z > riderZ).forEach(drawObstacle);
            powder.forEach(p => {
                ctx.globalAlpha = p.life / 360; ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalAlpha = 1;
            if (time > 8800) {
                const p = project(0, 0.25 + (time - 8800) / 1200 * 0.54);
                const width = (42 + (0.25 + (time - 8800) / 1200 * 0.54) * 380) * 1.7;
                ctx.strokeStyle = '#85a6b5'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(p.x - width / 2, p.y); ctx.lineTo(p.x - width / 2, p.y - 55 * p.scale);
                ctx.moveTo(p.x + width / 2, p.y); ctx.lineTo(p.x + width / 2, p.y - 55 * p.scale); ctx.stroke();
                kit.rounded(ctx, p.x - width / 2, p.y - 60 * p.scale, width, 21 * p.scale, 3, '#e4adb7');
                ctx.fillStyle = '#fffaf5'; ctx.textAlign = 'center'; ctx.font = '600 ' + Math.max(12, 14 * p.scale) + 'px "Noto Sans SC", Arial, sans-serif';
                ctx.fillText(t('skiFinish'), p.x, p.y - 45 * p.scale);
            }
        };
        ui.onPause = () => { player.vx = 0; player.lean = 0; };
        ui.onModeChange = () => { player.hearts = ui.relaxed ? 4 : 3; refresh(); };
        refresh();
        ui.intro(() => { player.hearts = ui.relaxed ? 4 : 3; refresh(); },
            { steps: [t('snowStep1'), t('snowStep2'), t('snowStep3')] });
        ui.loop(update, draw);
    }
};
