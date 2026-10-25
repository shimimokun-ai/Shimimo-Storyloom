const FightingGameMethods = {
    startFightingGame(targetNext) {
        this.setGameState(GameState.MINIGAME);
        const scope = this.beginActivity();
        this.stopAllSoundEffects();
        const container = document.getElementById('fighting-game-container');
        const canvas = document.getElementById('fight-canvas');
        const ctx = canvas.getContext('2d');
        const kit = ArcadeKit, t = kit.text;
        const ui = kit.create(this, scope, container, canvas, 'fight');
        const W = ui.width, H = ui.height, ground = H - 94;
        const art = kit.loadImages(scope, GameConfig.minigames.fighting.sprites || {});
        ui.shell.querySelector('.arcade-eyebrow').textContent = t('fightEyebrow');
        const hud = ui.shell.querySelector('.arcade-hud');
        hud.replaceChildren();
        const createPlate = (label, side, badge) => {
            const plate = kit.element('div', `fight-plate fight-plate-${side}`);
            const name = kit.element('div', 'fight-name');
            name.append(kit.element('span', 'fight-badge', badge), kit.element('strong', '', label));
            const meter = (label, className) => {
                const track = kit.element('div', className);
                track.setAttribute('role', 'progressbar'); track.setAttribute('aria-label', label);
                track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', '100');
                const fill = kit.element('span', 'fight-meter-fill'); track.append(fill);
                return { track, fill };
            };
            const hp = meter(label + ' · ' + t('health'), 'fight-health');
            const energy = meter(label + ' · ' + t('stamina'), 'fight-energy');
            plate.append(name, hp.track, energy.track);
            return { plate, hp, energy };
        };
        const playerPlate = createPlate(this.characterName(GameConfig.minigames.fighting.player), 'player', '1P');
        const enemyPlate = createPlate(this.characterName(GameConfig.minigames.fighting.opponent), 'enemy', 'CPU');
        const clock = kit.element('div', 'fight-clock');
        const clockValue = kit.element('strong', '', '45');
        clock.setAttribute('aria-label', t('time'));
        clock.append(kit.element('span', '', t('fightRound')), clockValue);
        hud.append(playerPlate.plate, clock, enemyPlate.plate);
        const comboBadge = kit.element('div', 'fight-combo');
        comboBadge.hidden = true; ui.stage.append(comboBadge);
        const prepareCard = card => {
            card.prepend(kit.element('span', 'fight-card-label', t('fightEyebrow')));
            if (ui.phase === 'intro') {
                const matchup = kit.element('div', 'fight-matchup');
                matchup.append(kit.element('span', '', '1P'), kit.element('strong', '', 'VS'), kit.element('span', '', 'CPU'));
                card.prepend(matchup);
                const status = kit.element('p', 'arcade-art-status'); card.append(status);
            } else if (ui.phase === 'ended') {
                card.prepend(kit.element('div', 'fight-result-mark', player.hp <= 0 || enemy.hp <= 0 ? 'K.O.' : t('fightVictory')));
            }
            syncArtCard();
        };
        const syncArtCard = () => {
            if (ui.phase !== 'intro') return;
            const card = ui.modal.querySelector('.arcade-card');
            if (!card) return;
            card.querySelector('.arcade-card-actions button').disabled = !art.ready;
            const status = card.querySelector('.arcade-art-status');
            if (status) { status.textContent = t(art.failed ? 'artLoadError' : 'artLoading'); status.hidden = art.ready; }
            if (art.failed && !card.querySelector('.fight-art-retry')) {
                card.querySelector('.arcade-card-actions').append(kit.button(t('retry'), () => {
                    ui.close(); this.startFightingGame(targetNext);
                }, 'fight-art-retry'));
            }
        };
        ui.onCard = prepareCard; art.onChange = syncArtCard;
        const player = { x: 260, y: ground, vy: 0, hp: 100, stamina: 100, color: '#78c8ed', hair: '#5b719d', facingRight: true, attack: null, hurt: 0, guarding: false, guardStart: 0 };
        const enemy = { x: W - 260, y: ground, vy: 0, hp: 100, stamina: 100, color: '#ed9db0', hair: '#715569', facingRight: false, attack: null, hurt: 0, guarding: false, guardStart: 0 };
        let time = 0, aiCooldown = 700, guardUntil = 0, pendingAttack = null;
        let hits = 0, combo = 0, bestCombo = 0, lastHit = -2000, parries = 0, counterUntil = 0;
        let impact = 0;
        const particles = [];
        const moves = {
            light: { windup: 90, active: 70, duration: 310, reach: 170, damage: 10, cost: 5 },
            heavy: { windup: 245, active: 95, duration: 690, reach: 190, damage: 23, cost: 18 }
        };
        const refresh = () => {
            for (const [fighter, plate] of [[player, playerPlate], [enemy, enemyPlate]]) {
                plate.hp.fill.style.transform = `scaleX(${fighter.hp / 100})`;
                plate.energy.fill.style.transform = `scaleX(${fighter.stamina / 100})`;
                plate.hp.track.setAttribute('aria-valuenow', String(Math.ceil(fighter.hp)));
                plate.energy.track.setAttribute('aria-valuenow', String(Math.ceil(fighter.stamina)));
                plate.plate.classList.toggle('fight-danger', fighter.hp < 25);
            }
            clockValue.textContent = String(Math.ceil(Math.max(0, 45 - time / 1000))).padStart(2, '0');
            comboBadge.hidden = combo < 2;
            comboBadge.textContent = combo + ' · ' + t('combo');
        };
        const finish = () => {
            const win = player.hp > 0 && (enemy.hp <= 0 || player.hp > enemy.hp);
            if (win) AchievementManager.unlock('fighting_win');
            ui.result(win, t(win ? 'fightWin' : 'fightLose'), [
                t('hits') + ': ' + hits, t('bestCombo') + ': ' + bestCombo, t('perfects') + ': ' + parries
            ], () => { ui.close(); this.startFightingGame(targetNext); }, () => { ui.close(); this.loadScene(targetNext); });
        };
        const startAttack = (fighter, type, isEnemy = false) => {
            const move = moves[type];
            if (fighter.attack || fighter.hurt > 0 || fighter.stamina < move.cost || fighter.guarding) return false;
            fighter.stamina -= move.cost;
            fighter.attack = { ...move, type, elapsed: 0, checked: false,
                windup: isEnemy ? (type === 'heavy' ? 480 : 290) + (ui.relaxed ? 90 : 0) : move.windup,
                duration: isEnemy ? (type === 'heavy' ? 1060 : 770) : move.duration,
                damage: isEnemy ? (type === 'heavy' ? 18 : 10) * (ui.relaxed ? 0.7 : 1) : move.damage };
            return true;
        };
        const spark = (x, y, color, count = 10) => {
            for (let n = 0; n < count; n++) {
                const angle = n / count * Math.PI * 2;
                particles.push({ x, y, vx: Math.cos(angle) * (95 + n * 5), vy: Math.sin(angle) * 130, life: 280, color });
            }
        };
        const strike = (attacker, defender) => {
            const attack = attacker.attack, facing = attacker.facingRight ? 1 : -1;
            if (Math.abs(attacker.x - defender.x) > attack.reach || Math.abs(attacker.y - defender.y) > 70
                || (defender.x - attacker.x) * facing < 0 || defender.hurt > 0) return false;
            const facesAttack = defender.facingRight ? attacker.x > defender.x : attacker.x < defender.x;
            const guardCost = attack.type === 'heavy' ? 30 : 18;
            if (defender.guarding && facesAttack && defender.stamina >= guardCost) {
                const perfect = defender === player && time - defender.guardStart <= (ui.relaxed ? 210 : 150);
                defender.stamina -= perfect ? 5 : guardCost;
                defender.hp = Math.max(0, defender.hp - (perfect || attack.type === 'light' ? 0 : 2));
                spark(defender.x, defender.y - 65, '#9fe6ff', 8);
                ui.tone(perfect ? 1046 : 440, 0.1, 0.1);
                ui.notify(t(perfect ? 'parry' : 'block'), 'good');
                if (perfect) {
                    parries++; counterUntil = time + 1050; attacker.hurt = 380; attacker.hitAt = time; attacker.attack = null;
                }
                return true;
            }
            let damage = attack.damage;
            const armored = defender === enemy && defender.attack?.type === 'heavy'
                && defender.attack.elapsed < defender.attack.windup && attack.type === 'light';
            if (attacker === player) {
                combo = time - lastHit < 1100 ? combo + 1 : 1;
                bestCombo = Math.max(bestCombo, combo); hits++; lastHit = time;
                damage += Math.min(6, (combo - 1) * 2);
                if (counterUntil > time) { damage += 6; counterUntil = 0; ui.notify(t('counter'), 'good'); }
                else ui.notify(t('hit') + ' · ' + combo, 'good', 400);
            } else { combo = 0; ui.notify(t('health') + ' −' + Math.round(damage), 'bad', 500); }
            if (armored) { damage *= 0.55; ui.notify(t('armor'), 'bad', 500); }
            defender.hp = Math.max(0, defender.hp - damage);
            if (!armored) defender.attack = null;
            defender.guarding = false; defender.hurt = armored ? 90 : 260; defender.hitAt = time;
            if (!armored) defender.x = kit.clamp(defender.x + facing * (attack.type === 'heavy' ? 40 : 21), 60, W - 60);
            spark(defender.x - facing * 22, defender.y - 58, attack.type === 'heavy' ? '#ffd09c' : '#d2f6ff');
            impact = 120;
            ui.tone(attack.type === 'heavy' ? 145 : 220, 0.075, 0.1, 'triangle');
            return true;
        };
        const act = action => {
            if (action === 'jump' && player.y >= ground && !player.attack && player.hurt <= 0) {
                player.vy = -585; player.guarding = false; ui.tone(390, 0.035, 0.045);
            } else if (action === 'light' || action === 'heavy') {
                if (!startAttack(player, action)) pendingAttack = { type: action, until: time + 250 };
            }
        };
        ui.bindControls([
            { id: 'left', label: 'left', key: 'A / ←', icon: 'a', codes: ['KeyA', 'ArrowLeft'] },
            { id: 'right', label: 'right', key: 'D / →', icon: 'd', codes: ['KeyD', 'ArrowRight'] },
            { id: 'jump', label: 'jump', key: 'Space', icon: 'space', codes: ['Space'] },
            { id: 'light', label: 'light', key: 'J', icon: 'j', codes: ['KeyJ'] },
            { id: 'guard', label: 'guard', key: 'K', icon: 'k', codes: ['KeyK'] },
            { id: 'heavy', label: 'heavy', key: 'L', icon: 'l', codes: ['KeyL'] }
        ], act);
        const controls = [...ui.footer.querySelectorAll('.arcade-control')];
        const movementKeys = kit.element('div', 'fight-movement-keys');
        const attackKeys = kit.element('div', 'fight-attack-keys');
        const stick = kit.element('div', 'fight-stick');
        stick.setAttribute('aria-hidden', 'true'); stick.append(kit.element('span', 'fight-stick-knob'));
        movementKeys.append(stick, ...controls.slice(0, 3));
        controls.slice(3).forEach((button, index) => {
            button.classList.add(['fight-light', 'fight-guard', 'fight-heavy'][index]);
            button.prepend(kit.element('span', 'fight-key-letter', ['J', 'K', 'L'][index]));
            attackKeys.append(button);
        });
        ui.footer.append(movementKeys, attackKeys);
        ui.onPause = () => { pendingAttack = null; };
        const update = step => {
            const dt = step / 1000;
            time += step; impact = Math.max(0, impact - step); aiCooldown -= step;
            if (time - lastHit > 1100) combo = 0;
            for (const fighter of [player, enemy]) {
                fighter.hurt = Math.max(0, fighter.hurt - step);
                fighter.vy += 1650 * dt; fighter.y = Math.min(ground, fighter.y + fighter.vy * dt);
                if (fighter.y >= ground) fighter.vy = 0;
            }
            if (!player.attack && player.hurt === 0) player.facingRight = player.x < enemy.x;
            if (!enemy.attack && enemy.hurt === 0) enemy.facingRight = enemy.x < player.x;
            const wasGuarding = player.guarding;
            player.guarding = Boolean(ui.held.guard) && player.stamina >= 10 && !player.attack && player.hurt === 0 && player.y >= ground;
            if (player.guarding && !wasGuarding) player.guardStart = time;
            enemy.guarding = guardUntil > time && !enemy.attack && enemy.hurt === 0 && enemy.stamina > 20;
            for (const fighter of [player, enemy]) {
                fighter.stamina = kit.clamp(fighter.stamina + (fighter.guarding ? -16 : 26) * dt, 0, 100);
            }
            const movement = Number(Boolean(ui.held.right)) - Number(Boolean(ui.held.left));
            player.moving = movement !== 0 && !player.attack && player.hurt === 0;
            if (player.moving) player.x += movement * (player.guarding ? 92 : 220) * dt;
            const distance = Math.abs(player.x - enemy.x);
            enemy.moving = !enemy.attack && !enemy.guarding && enemy.hurt === 0 && distance > 130;
            if (enemy.moving) enemy.x += Math.sign(player.x - enemy.x) * (ui.relaxed ? 128 : 155) * dt;
            if (aiCooldown <= 0 && !enemy.attack && enemy.hurt === 0) {
                if (distance < 190) {
                    if (!ui.relaxed && Math.random() < 0.2) guardUntil = time + 460;
                    else { enemy.guarding = false; startAttack(enemy, Math.random() < 0.4 ? 'heavy' : 'light', true); }
                    aiCooldown = ui.relaxed ? 1460 : 1180;
                } else aiCooldown = 220;
            }
            if (pendingAttack) {
                if (pendingAttack.until < time) pendingAttack = null;
                else if (startAttack(player, pendingAttack.type)) pendingAttack = null;
            }
            player.x = kit.clamp(player.x, 60, W - 60); enemy.x = kit.clamp(enemy.x, 60, W - 60);
            if (Math.abs(player.x - enemy.x) < 82 && Math.abs(player.y - enemy.y) < 60) {
                const direction = player.x < enemy.x ? -1 : 1, separation = (82 - Math.abs(player.x - enemy.x)) / 2;
                player.x = kit.clamp(player.x + direction * separation, 60, W - 60);
                enemy.x = kit.clamp(enemy.x - direction * separation, 60, W - 60);
            }
            // Each attack has a visible windup and resolves contact once.
            for (const fighter of [player, enemy]) if (fighter.attack) fighter.attack.elapsed += step;
            for (const [attacker, defender] of [[player, enemy], [enemy, player]]) {
                const attack = attacker.attack;
                if (!attack) continue;
                if (!attack.checked && attack.elapsed >= attack.windup && attack.elapsed <= attack.windup + attack.active) {
                    attack.checked = strike(attacker, defender);
                }
                if (attacker.attack && attack.elapsed >= attack.duration) attacker.attack = null;
            }
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i]; p.life -= step; p.x += p.vx * dt; p.y += p.vy * dt;
                if (p.life <= 0) particles.splice(i, 1);
            }
            refresh();
            if (player.hp <= 0 || enemy.hp <= 0 || time >= 45000) finish();
        };
        const drawFighter = (fighter, kind) => {
            const second = kind === 'shinobi';
            const counts = { Idle: second ? 4 : 8, Run: 8, Jump: 2, Fall: 2,
                Light: second ? 4 : 6, Heavy: second ? 4 : 6, Hit: second ? 3 : 4, Death: second ? 7 : 6 };
            let pose = 'Idle', frame = Math.floor(time / 130) % counts.Idle;
            if (fighter.hp <= 0) { pose = 'Death'; frame = counts.Death - 1; }
            else if (fighter.hurt > 0) { pose = 'Hit'; frame = kit.clamp(Math.floor((time - (fighter.hitAt || 0)) / 85), 0, counts.Hit - 1); }
            else if (fighter.attack) {
                const attack = fighter.attack;
                pose = attack.type === 'heavy' ? 'Heavy' : 'Light';
                const contactFrame = second ? 2 : 4;
                if (attack.elapsed < attack.windup) frame = Math.min(contactFrame - 1, Math.floor(attack.elapsed / attack.windup * contactFrame));
                else if (attack.elapsed <= attack.windup + attack.active) frame = Math.min(counts[pose] - 1,
                    contactFrame + Math.floor((attack.elapsed - attack.windup) / attack.active * (counts[pose] - contactFrame)));
                else { pose = 'Idle'; frame = 0; }
            } else if (fighter.y < ground) { pose = fighter.vy < 0 ? 'Jump' : 'Fall'; frame = fighter.vy < -250 || fighter.vy > 250 ? 1 : 0; }
            else if (fighter.moving) { pose = 'Run'; frame = Math.floor(time / 90) % counts.Run; }
            else if (fighter.guarding) frame = 0;
            const picture = art.images[kind + pose];
            if (!picture?.complete || !picture.naturalWidth) {
                ctx.save(); ctx.translate(fighter.x, fighter.y); ctx.scale(fighter.facingRight ? 1 : -1, 1);
                ctx.globalAlpha = fighter.hurt > 0 ? 0.6 : 1;
                kit.rounded(ctx, -24, -105, 48, 74, 12, fighter.color);
                ctx.fillStyle = fighter.hair; ctx.beginPath(); ctx.arc(0, -124, 20, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = fighter.color; ctx.lineWidth = 13; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(-13, -34); ctx.lineTo(-21, 0); ctx.moveTo(13, -34); ctx.lineTo(23, 0);
                ctx.moveTo(18, -85); ctx.lineTo(fighter.attack ? 72 : fighter.guarding ? 35 : 30, fighter.guarding ? -114 : -69); ctx.stroke();
                ctx.restore(); return;
            }
            const cell = picture.naturalWidth / counts[pose];
            ctx.save(); ctx.translate(fighter.x, fighter.y);
            ctx.fillStyle = '#060c1c66'; ctx.beginPath(); ctx.ellipse(0, 3, 39, 9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.scale(fighter.facingRight ? 2.5 : -2.5, second ? 2.85 : 3);
            ctx.drawImage(picture, frame * cell, 0, cell, picture.naturalHeight,
                -(second ? 97 : 94), -(second ? 128 : 122), cell, picture.naturalHeight);
            ctx.restore();
            if (fighter.guarding) {
                const side = fighter.facingRight ? 1 : -1;
                ctx.strokeStyle = '#8ae5f3'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(fighter.x + side * 43, fighter.y - 134);
                ctx.lineTo(fighter.x + side * 59, fighter.y - 80); ctx.lineTo(fighter.x + side * 43, fighter.y - 28); ctx.stroke();
            }
        };
        const draw = () => {
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#11192e'); bg.addColorStop(0.65, '#384666'); bg.addColorStop(1, '#171d34');
            ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            if (impact > 0 && !ui.reducedMotion && ui.phase === 'playing') ctx.translate(Math.sin(time * 0.15) * impact / 45, 0);
            ctx.fillStyle = '#ebd9c5'; ctx.beginPath(); ctx.arc(W / 2, 108, 52, 0, Math.PI * 2); ctx.fill();
            for (let layer = 0; layer < 2; layer++) {
                ctx.fillStyle = layer ? '#26354b' : '#394968';
                ctx.beginPath(); ctx.moveTo(0, ground);
                for (let i = 0; i <= 8; i++) ctx.lineTo(i * 140, 204 + Math.sin(i * 2.2 + layer) * 65 + layer * 40);
                ctx.lineTo(W, ground); ctx.closePath(); ctx.fill();
            }
            // A moonlit dojo inside the cabinet screen, not another arcade-room UI.
            ctx.fillStyle = '#192335'; ctx.fillRect(55, 223, W - 110, ground - 223);
            ctx.fillStyle = '#0b1424'; ctx.beginPath(); ctx.moveTo(12, 220); ctx.lineTo(140, 174);
            ctx.lineTo(W - 140, 174); ctx.lineTo(W - 12, 220); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#65738a'; ctx.fillRect(36, 222, W - 72, 6);
            for (let i = 0; i < 7; i++) {
                const x = 80 + i * 128;
                ctx.fillStyle = '#6d576b'; ctx.fillRect(x, 246, 95, 135);
                ctx.fillStyle = '#c58e7955'; ctx.fillRect(x + 5, 251, 85, 125);
                ctx.fillStyle = '#273144'; ctx.fillRect(x + 45, 246, 5, 135);
                ctx.fillRect(x, 288, 95, 4); ctx.fillRect(x, 333, 95, 4);
                ctx.fillStyle = '#101d2c'; ctx.fillRect(x - 10, 228, 9, ground - 228);
            }
            for (const x of [42, W - 42]) {
                ctx.fillStyle = '#dd9a89'; ctx.fillRect(x - 11, 246, 22, 40);
                ctx.fillStyle = '#fed7aa'; ctx.fillRect(x - 8, 254, 16, 23);
                ctx.fillStyle = '#52384c'; ctx.fillRect(x - 13, 244, 26, 4); ctx.fillRect(x - 13, 285, 26, 4);
            }
            ctx.fillStyle = '#373645'; ctx.fillRect(0, ground - 45, W, 45);
            ctx.strokeStyle = '#dcbfa074'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, ground); ctx.lineTo(W, ground); ctx.stroke();
            ctx.fillStyle = '#27394d'; ctx.fillRect(0, ground + 4, W, H - ground - 4);
            ctx.strokeStyle = '#93abc31c'; ctx.lineWidth = 1;
            for (let i = -4; i <= 8; i++) {
                ctx.beginPath(); ctx.moveTo(W / 2, ground); ctx.lineTo(i * 160, H); ctx.stroke();
            }
            for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(0, ground + i * 28); ctx.lineTo(W, ground + i * 28); ctx.stroke(); }
            drawFighter(player, 'ronin'); drawFighter(enemy, 'shinobi');
            for (const fighter of [player, enemy]) {
                if (fighter.attack && fighter.attack.elapsed < fighter.attack.windup) {
                    const heavy = fighter.attack.type === 'heavy';
                    kit.rounded(ctx, fighter.x - 68, fighter.y - 205, 136, 30, 3, heavy ? '#a34746' : '#3e6075');
                    ctx.fillStyle = '#fff5e9'; ctx.font = '600 14px "Noto Sans SC", Arial, sans-serif'; ctx.textAlign = 'center';
                    ctx.fillText(heavy && fighter === enemy ? t('windup') : t(heavy ? 'heavy' : 'light'), fighter.x, fighter.y - 184);
                    kit.rounded(ctx, fighter.x - 60, fighter.y - 170, 120 * fighter.attack.elapsed / fighter.attack.windup, 4, 2, '#ffe0ae');
                }
            }
            particles.forEach(p => { ctx.globalAlpha = p.life / 280; ctx.fillStyle = p.color; ctx.fillRect(p.x - 3, p.y - 3, 6, 6); });
            ctx.globalAlpha = 1; ctx.restore();
        };
        refresh();
        ui.intro(() => {}, { steps: [t('fightStep1'), t('fightStep2'), t('fightStep3')] });
        ui.loop(update, draw);
    }
};
