// Shared presentation, input and lifecycle for the story's short arcade games.
// Default graphics and input labels are drawn by code. Optional art comes from project config.
const ArcadeKit = (() => {
    const copy = {
        zh: {
            start: '开始挑战', resume: '继续挑战', pause: '暂停', paused: '已暂停',
            pauseHint: '准备好后继续。切出窗口时，计时和操作都会暂停。',
            retry: '再来一次', continue: '继续剧情', difficulty: '挑战模式',
            standard: '标准', relaxed: '轻松', countdown: '准备', go: '开始！',
            resultWin: '挑战完成', resultLose: '再练一局？',
            move: '移动', left: '向左', right: '向右', up: '向上', down: '向下',
            jump: '跳跃', light: '轻击', heavy: '重击', guard: '防御', dash: '冲刺', center: '中键',
            hit: '命中', block: '防住了', parry: '精准防御', counter: '反击',
            fightTitle: '双子星对决', fightSub: '街机格斗 · 读懂起手，抓住反击',
            fightEyebrow: '归家部 · 街机厅', fightRound: '第一回合', fightVictory: '胜负已分',
            artLoading: '正在加载角色与场景…', artLoadError: '素材加载失败，请重试。',
            fightIntro: '用走位和防御找机会。重击伤害高，但出手和收招都更慢。',
            fightStep1: 'A / D 或方向键移动，空格跳跃，J 轻击，L 重击。',
            fightStep2: '按住 K 防御。对手重击起手不怕轻击打断，可格挡、后退，或用重击打断。',
            fightStep3: '连续轻击可连招；防御耗体力，松开恢复。45 秒内分胜负。',
            you: '你', rival: '对手', time: '剩余时间', health: '生命', stamina: '体力',
            hits: '命中次数', combo: '连击', perfects: '精准防御', windup: '准备重击',
            fightWin: '抓住了对手的破绽。', fightLose: '观察起手提示，防住之后再出手。', armor: '重击霸体',
            snowTitle: '粉雪滑行', snowSub: '阳菜的下坡挑战 · 把雪球留在身后',
            snowEyebrow: '冬日合宿 · 雪山时光', skiSpeed: '滑行速度', skiJump: '短跳闪避',
            skiBrake: '犁式刹车', skiTuck: '压低加速', skiDistance: '滑行距离', skiGates: '穿过旗门',
            skiProgress: '雪道进度', skiFinish: '终点', skiHint: '自动向前滑行 · 左右转向，提前避开雪球与岩石',
            snowIntro: '自动向前滑行，保持生命滑过 10 秒。左右转向带一点惯性，提前看清前方的雪球和岩石。',
            snowStep1: 'A / D 或左右箭头转向；W / ↑ 压低加速，S / ↓ 犁式刹车，减慢前方障碍接近的速度。',
            snowStep2: '空格 / Shift 短跳闪避，可以越过障碍；落地后等待冷却。触屏也可使用下方按钮。',
            snowStep3: '标准 3 格生命，轻松 4 格。绿色旗门是额外奖励，漏过不扣血；贴边躲过障碍获得擦过奖励。',
            grazes: '擦弹', ready: '就绪', cooldown: '冷却', wave: '雪势',
            snowWin: '最后一段粉雪也滑过去了！', snowLose: '试着早点转向，按住刹车给自己多一点反应时间。',
            rhythmTitle: '心跳连线', rhythmSub: '和大家一起，把这一段节奏接住。',
            rhythmEyebrow: '归家部 · 街机时光', rhythmTrack: '蓝色闪电',
            rhythmPromise: '接住每一拍，不让约定掉线。', rhythmRival: '挑战对手',
            rhythmReady: '准备好，接住下一拍', rhythmStart: '开始这一曲',
            rhythmResultWin: '这一段心跳，同频了', rhythmResultLose: '再听一遍，也没关系',
            rhythmTarget: '心跳线', rhythmLink: '同频连击',
            rhythmLaneA: '左侧音轨', rhythmLaneS: '中间音轨', rhythmLaneD: '右侧音轨',
            rhythmStandard: '认真挑战', rhythmRelaxed: '轻松听拍',
            rhythmIntro: '让音符落到判定线时按下对应键。听节拍，也能看底部的节拍灯。',
            rhythmStep1: '使用 A / S / D，也可以点击下方对应按键。',
            rhythmStep2: '粉色心跳线就是击打位置，±90 ms 为 PERFECT。',
            rhythmStep3: '标准模式命中至少 8 / 10 个；轻松模式 7 / 10 个。失误只会断连，不会立刻结束。',
            accuracy: '准确率', notes: '命中音符', bestCombo: '最高连击', score: '得分',
            timing: '判定', early: '偏早', late: '偏晚', miss: '漏拍',
            rhythmWin: '跟上了这段心跳。', rhythmLose: '等音符靠近判定线再按，试着听着节拍来。',
            fullCombo: '全连！', soundHint: '节拍音受音效音量控制，静音时可看节拍灯。',
            writingTitle: '把心愿留在短册上', writingSub: '手写时刻 · 一笔一划，留住这一天',
            writingIntro: '写下名字或画一个小图案。这里没有计时，也不评判字迹。',
            writingStep1: '鼠标或触屏书写；可以调整笔粗、撤销上一笔、清空重写。',
            writingStep2: '写好后选择“挂上短册”，继续故事。',
            brush: '笔粗', thin: '细', medium: '中', thick: '粗', undo: '撤销一笔',
            clear: '清空', cancel: '取消', clearConfirm: '清空后，当前短册上的笔画将全部移除。',
            paperFull: '笔画较多，请先撤销或清空再写。', finish: '挂上短册', strokes: '笔画',
            writingHint: '从这里落笔。名字、心愿，或者一个小小的笑脸。'
        },
        ja: {
            start: 'チャレンジ開始', resume: '再開', pause: '一時停止', paused: '一時停止中',
            pauseHint: '準備ができたら再開してください。別のウィンドウに切り替えると時間も止まります。',
            retry: 'もう一度', continue: '物語へ戻る', difficulty: 'モード',
            standard: 'スタンダード', relaxed: 'リラックス', countdown: '準備', go: 'スタート！',
            resultWin: 'クリア', resultLose: 'もう一勝負？', move: '移動',
            left: '左', right: '右', up: '上', down: '下', jump: 'ジャンプ',
            light: '弱攻撃', heavy: '強攻撃', guard: 'ガード', dash: 'ダッシュ', center: '中央',
            hit: 'ヒット', block: 'ガード成功', parry: 'ジャストガード', counter: '反撃',
            fightTitle: '双子星の対決', fightSub: 'アーケード格闘 · 隙を読んで反撃',
            fightEyebrow: '帰宅部 · ゲームセンター', fightRound: '第1ラウンド', fightVictory: '決着',
            artLoading: 'キャラクターと背景を読み込み中…', artLoadError: '素材を読み込めませんでした。再試行してください。',
            fightIntro: '移動とガードでチャンスを作ろう。強攻撃は威力が高いぶん、隙も大きい。',
            fightStep1: 'A / D または矢印キーで移動、スペースでジャンプ、Jで弱攻撃、Lで強攻撃。',
            fightStep2: 'Kでガード。相手の強攻撃の構えは弱攻撃では止まらない。防ぐ、離れる、強攻撃で止める。',
            fightStep3: '弱攻撃でコンボ。ガードはスタミナを使い、離すと回復。制限時間は45秒。',
            you: 'あなた', rival: '相手', time: '残り時間', health: '体力', stamina: 'スタミナ',
            hits: 'ヒット数', combo: 'コンボ', perfects: 'ジャストガード', windup: '強攻撃の予告',
            fightWin: '相手の隙を見逃さなかった。', fightLose: '攻撃の予告を見て、防いでから反撃しよう。', armor: '強攻撃のアーマー',
            snowTitle: 'パウダースノー・ラン', snowSub: '陽菜の下り坂チャレンジ · 雪玉を置き去りに',
            snowEyebrow: '冬の合宿 · 雪山のひととき', skiSpeed: '滑走速度', skiJump: '小ジャンプ',
            skiBrake: 'ボーゲンで減速', skiTuck: '姿勢を低くして加速', skiDistance: '滑走距離', skiGates: '通過した旗門',
            skiProgress: 'コース進行', skiFinish: 'ゴール', skiHint: '自動で前進 · 左右に曲がって雪玉と岩を避けよう',
            snowIntro: '自動で滑りながら10秒間ライフを守ろう。旋回には少し慣性があります。前方の雪玉と岩を早めに見て避けて。',
            snowStep1: 'A / D または左右キーで旋回。W / ↑ で加速、S / ↓ のボーゲンで障害物の接近を遅くできます。',
            snowStep2: 'スペース / Shift の小ジャンプで障害物を越えよう。着地後はクールダウン。画面下のボタンでも操作できます。',
            snowStep3: '通常ライフ3、リラックス4。緑の旗門はボーナスで、逃してもダメージなし。すれすれの回避も加点。',
            grazes: 'かすり', ready: '使用可能', cooldown: '回復中', wave: '雪の勢い',
            snowWin: '最後のパウダースノーも滑り切った！', snowLose: '早めに曲がり、減速して反応する時間を作ろう。',
            rhythmTitle: 'ハートビートリンク', rhythmSub: 'みんなと一緒に、このリズムを受け止めよう。',
            rhythmEyebrow: '帰宅部 · 放課後のゲームセンター', rhythmTrack: '青い稲妻',
            rhythmPromise: '一拍ずつ、この約束をつないで。', rhythmRival: '対戦相手',
            rhythmReady: '次の一拍、受け止めよう', rhythmStart: 'この曲をはじめる',
            rhythmResultWin: 'この鼓動が、重なった', rhythmResultLose: 'もう一度聴いても、大丈夫',
            rhythmTarget: 'ハートライン', rhythmLink: 'シンクロコンボ',
            rhythmLaneA: '左のレーン', rhythmLaneS: '中央のレーン', rhythmLaneD: '右のレーン',
            rhythmStandard: 'チャレンジ', rhythmRelaxed: 'リラックス',
            rhythmIntro: 'ノーツが判定ラインに来たらキーを押そう。音と下の拍ランプを目安に。',
            rhythmStep1: 'A / S / Dを使用。下のボタンをクリックしても遊べる。',
            rhythmStep2: 'ピンクのハートラインが判定位置。±90 ms以内ならPERFECT。',
            rhythmStep3: '通常は8/10、リラックスは7/10でクリア。ミスでコンボは切れるが、すぐには終了しない。',
            accuracy: '精度', notes: 'ヒットノーツ', bestCombo: '最大コンボ', score: 'スコア',
            timing: '判定', early: '早い', late: '遅い', miss: 'ミス',
            rhythmWin: 'この鼓動に追いついた。', rhythmLose: '判定ラインに近づいてから、拍に合わせて押してみよう。',
            fullCombo: 'フルコンボ！', soundHint: '拍の音はSE音量に従います。無音でも拍ランプで遊べます。',
            writingTitle: '短冊に願いを残そう', writingSub: '手書きの時間 · 今日を一筆ずつ残す',
            writingIntro: '名前や小さな絵を描こう。制限時間も、字の上手さの判定もありません。',
            writingStep1: 'マウスやタッチで書けます。太さの変更、ひと筆の取り消し、全消去も可能。',
            writingStep2: '書き終えたら「短冊を掛ける」で物語に戻ります。',
            brush: '筆の太さ', thin: '細', medium: '中', thick: '太', undo: 'ひと筆戻す',
            clear: '全消去', cancel: 'キャンセル', clearConfirm: '短冊に書いた線をすべて消します。',
            paperFull: '線が多すぎます。取り消すか、全消去してから続けてください。', finish: '短冊を掛ける', strokes: '画数',
            writingHint: '名前、願い、それとも小さな笑顔。ここから書き始めよう。'
        },
        en: {
            start: 'Start challenge', resume: 'Resume', pause: 'Pause', paused: 'Paused',
            pauseHint: 'Resume when you are ready. Leaving the window pauses the clock and controls.',
            retry: 'Try again', continue: 'Continue story', difficulty: 'Mode',
            standard: 'Standard', relaxed: 'Relaxed', countdown: 'Ready', go: 'Go!',
            resultWin: 'Challenge cleared', resultLose: 'Another round?',
            move: 'Move', left: 'Left', right: 'Right', up: 'Up', down: 'Down',
            jump: 'Jump', light: 'Light hit', heavy: 'Heavy hit', guard: 'Guard', dash: 'Dash',
            hit: 'Hit', block: 'Blocked', parry: 'Perfect guard', counter: 'Counter', center: 'Center',
            fightTitle: 'Twin Star Duel', fightSub: 'Arcade sparring · Read the windup, find an opening',
            fightEyebrow: 'AFTER-SCHOOL ARCADE', fightRound: 'ROUND 01', fightVictory: 'MATCH OVER',
            artLoading: 'Loading characters and scenery…', artLoadError: 'The artwork could not load. Please retry.',
            fightIntro: 'Use movement and guard to create openings. Heavy hits deal more damage but take longer to start and recover.',
            fightStep1: 'A / D or arrows to move, Space to jump, J for a light hit, L for a heavy hit.',
            fightStep2: 'Hold K to guard. Light hits cannot interrupt a rival heavy windup: block, step back, or use a heavy hit.',
            fightStep3: 'Chain light hits for combos. Guard drains stamina; release to recover. Each round lasts up to 45 seconds.',
            you: 'You', rival: 'Rival', time: 'Time left', health: 'Health', stamina: 'Stamina',
            hits: 'Hits', combo: 'Combo', perfects: 'Perfect guards', windup: 'Heavy incoming',
            fightWin: 'You found the opening.', fightLose: 'Watch the windup, block, then take your turn.', armor: 'Heavy armor',
            snowTitle: 'Powder Snow Run', snowSub: 'Hina’s downhill challenge · Leave the snowballs behind',
            snowEyebrow: 'WINTER CAMP · SNOW DAYS', skiSpeed: 'Speed', skiJump: 'Hop to dodge',
            skiBrake: 'Snowplow brake', skiTuck: 'Tuck to accelerate', skiDistance: 'Distance skied', skiGates: 'Gates cleared',
            skiProgress: 'Course progress', skiFinish: 'FINISH', skiHint: 'Glide forward automatically · Steer around snowballs and rocks',
            snowIntro: 'Keep your hearts for a 10-second downhill run. Steering has a little momentum, so watch snowballs and rocks ahead.',
            snowStep1: 'A / D or left / right steer. W / ↑ tucks to accelerate; S / ↓ brakes to slow approaching obstacles.',
            snowStep2: 'Space / Shift hops over obstacles, then needs a recharge. The buttons below also work on touch screens.',
            snowStep3: 'Standard has 3 hearts, Relaxed has 4. Green gates are optional bonuses, never hazards. Close dodges earn near-miss points.',
            grazes: 'Near misses', ready: 'Ready', cooldown: 'Recharging', wave: 'Snowfall',
            snowWin: 'You made it through the final stretch of powder!', snowLose: 'Turn a little sooner, and brake to give yourself more time.',
            rhythmTitle: 'Heartbeat Link', rhythmSub: 'Catch this little rhythm, together with everyone.',
            rhythmEyebrow: 'AFTER-SCHOOL ARCADE', rhythmTrack: 'Blue Lightning',
            rhythmPromise: 'Every beat keeps our promise alive.', rhythmRival: 'Your rival',
            rhythmReady: 'Ready for the next beat?', rhythmStart: 'Play this session',
            rhythmResultWin: 'Our heartbeats found their rhythm', rhythmResultLose: 'One more listen is always okay',
            rhythmTarget: 'Heartbeat line', rhythmLink: 'In sync',
            rhythmLaneA: 'Left lane', rhythmLaneS: 'Middle lane', rhythmLaneD: 'Right lane',
            rhythmStandard: 'Challenge', rhythmRelaxed: 'Relaxed',
            rhythmIntro: 'Press when a note reaches the judgment line. Follow the beat or the beat lights below.',
            rhythmStep1: 'Use A / S / D, or click the matching buttons below.',
            rhythmStep2: 'The pink heartbeat line is your target. Within ±90 ms earns PERFECT.',
            rhythmStep3: 'Pass with 8/10 hits in Standard, or 7/10 in Relaxed. A miss breaks your combo but does not end the session.',
            accuracy: 'Accuracy', notes: 'Notes hit', bestCombo: 'Best combo', score: 'Score',
            timing: 'Judgment', early: 'Early', late: 'Late', miss: 'Miss',
            rhythmWin: 'You kept up with this heartbeat.', rhythmLose: 'Wait for the judgment line and try following the beat.',
            fullCombo: 'Full combo!', soundHint: 'Beat sounds follow sound-effect volume. Beat lights work even with sound muted.',
            writingTitle: 'Leave a wish on your paper slip', writingSub: 'A handwritten moment · Keep a little of today',
            writingIntro: 'Write a name or draw something small. There is no timer and no handwriting score.',
            writingStep1: 'Draw with a mouse or touch. Change brush size, undo a stroke, or clear the page.',
            writingStep2: 'Choose “Hang the slip” when you are ready to return to the story.',
            brush: 'Brush', thin: 'Fine', medium: 'Medium', thick: 'Bold', undo: 'Undo stroke',
            clear: 'Clear', cancel: 'Cancel', clearConfirm: 'This removes every stroke from the current paper slip.',
            paperFull: 'The paper has many strokes. Undo or clear it before continuing.', finish: 'Hang the slip', strokes: 'Strokes',
            writingHint: 'A name, a wish, or a little smile. Your first stroke starts here.'
        }
    };
    const prompts = GameConfig.minigames.inputPrompts || {};
    const promptLicense = '';
    const artLicenses = [];
    const text = key => (copy[RuntimeState.language] || copy.zh)[key] || copy.en[key] || key;
    const element = (tag, className, content) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (content !== undefined) node.textContent = content;
        return node;
    };
    const button = (label, action, className = '') => {
        const node = element('button', `arcade-button ${className}`, label);
        node.type = 'button';
        node.addEventListener('click', event => { event.stopPropagation(); action(event); });
        return node;
    };
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    function loadImages(scope, sources) {
        const state = { images: {}, ready: false, failed: false, onChange: null };
        let remaining = Object.keys(sources).length;
        for (const [key, source] of Object.entries(sources)) {
            const picture = new Image();
            state.images[key] = picture;
            const settled = success => {
                if (scope.closed) return;
                state.failed ||= !success;
                remaining--;
                state.ready = remaining === 0 && !state.failed;
                state.onChange?.();
            };
            scope.listen(picture, 'load', () => settled(picture.naturalWidth > 0), { once: true });
            scope.listen(picture, 'error', () => settled(false), { once: true });
            picture.src = source;
        }
        scope.defer(() => {
            state.onChange = null;
            Object.values(state.images).forEach(picture => picture.removeAttribute('src'));
        });
        state.ready = remaining === 0;
        return state;
    }
    const rounded = (ctx, x, y, w, h, radius, fill) => {
        ctx.fillStyle = fill;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill();
    };

    function create(engine, scope, container, canvas, kind) {
        const logicalWidth = canvas.width, logicalHeight = canvas.height;
        let resizePending = true;
        engine.stopVoice({ scheduleAuto: false });
        engine.dialogueBox.classList.add('hidden');
        engine.charLayer.classList.add('hidden');
        container.replaceChildren();
        container.className = `arcade-overlay arcade-${kind} visible`;
        container.inert = false;
        container.setAttribute('aria-hidden', 'false');
        const previousFocus = document.activeElement;
        const shell = element('section', 'arcade-shell');
        shell.setAttribute('aria-label', text(`${kind}Title`));
        const header = element('header', 'arcade-header');
        const heading = element('div', 'arcade-heading');
        heading.append(element('span', 'arcade-eyebrow', 'AFTER SCHOOL / PLAY SESSION'),
            element('h2', '', text(`${kind}Title`)), element('p', '', text(`${kind}Sub`)));
        const hud = element('div', 'arcade-hud');
        const stage = element('div', 'arcade-stage');
        canvas.className = 'arcade-canvas';
        canvas.tabIndex = 0;
        canvas.setAttribute('aria-label', text(`${kind}Title`));
        const notice = element('div', 'arcade-notice');
        const modal = element('div', 'arcade-modal');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        const footer = element('footer', 'arcade-controls');
        const stats = new Map();
        const ui = {
            phase: 'intro', countdown: 0, held: {}, pausedPhase: null,
            width: logicalWidth, height: logicalHeight,
            relaxed: SaveManager.get('minigame_difficulty', 'standard') === 'relaxed',
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            shell, stage, footer, canvas, modal, sound: null, voices: new Set(), mutedBgm: false,
            stat(key, label, value) {
                if (!stats.has(key)) {
                    const wrap = element('div', 'arcade-stat');
                    wrap.dataset.stat = key;
                    const output = element('strong', '');
                    wrap.append(element('span', '', label), output);
                    hud.append(wrap); stats.set(key, output);
                }
                const output = stats.get(key);
                if (output.textContent !== String(value)) output.textContent = String(value);
            },
            notify(message, type = 'good', duration = 650) {
                notice.textContent = message;
                notice.className = `arcade-notice show ${type}`;
                this.noticeRemaining = duration;
            },
            card(title, description, actions, details = []) {
                modal.replaceChildren(); modal.hidden = false;
                const card = element('div', 'arcade-card');
                const titleEl = element('h3', '', title);
                titleEl.id = `${container.id}-card-title`;
                modal.setAttribute('aria-labelledby', titleEl.id);
                card.append(titleEl, element('p', '', description));
                if (details.length) {
                    const list = element('ul', 'arcade-card-details');
                    details.forEach(line => list.append(element('li', '', line)));
                    card.append(list);
                }
                const buttons = element('div', 'arcade-card-actions');
                actions.forEach((action, index) => buttons.append(button(action.label, () => {
                    if (this.phase !== 'closed') action.run();
                },
                    index === 0 ? 'arcade-button-primary' : '')));
                card.append(buttons); modal.append(card);
                this.onCard?.(card);
                buttons.querySelector('button')?.focus({ preventScroll: true });
            },
            intro(start, { timed = true, steps = [], difficulty = true } = {}) {
                this.card(text(`${kind}Title`), text(`${kind}Intro`), [{ label: text('start'), run: () => {
                    this.unlockAudio();
                    this.phase = timed ? 'countdown' : 'playing';
                    pauseButton.disabled = false;
                    this.countdown = timed ? 1800 : 0;
                    this.clearInput?.(); this.held = {};
                    modal.hidden = true;
                    canvas.focus({ preventScroll: true });
                    start();
                } }], steps);
                if (difficulty) {
                    const modes = element('div', 'arcade-modes');
                    modes.setAttribute('role', 'group');
                    modes.setAttribute('aria-label', text('difficulty'));
                    [false, true].forEach(relaxed => {
                        const choice = button(text(relaxed ? 'relaxed' : 'standard'), () => {
                            this.relaxed = relaxed;
                            SaveManager.set('minigame_difficulty', relaxed ? 'relaxed' : 'standard');
                            this.onModeChange?.();
                            modes.querySelectorAll('button').forEach((btn, index) => {
                                btn.setAttribute('aria-pressed', String(index === (relaxed ? 1 : 0)));
                            });
                        });
                        choice.setAttribute('aria-pressed', String(relaxed === this.relaxed));
                        modes.append(choice);
                    });
                    modal.querySelector('.arcade-card-actions').before(modes);
                }
            },
            pause() {
                if (!['playing', 'countdown'].includes(this.phase)) return;
                this.pausedPhase = this.phase; this.phase = 'paused'; this.clearInput?.(); this.held = {};
                pauseButton.disabled = true; this.onPause?.();
                this.silence();
                footer.querySelectorAll('.pressed').forEach(node => node.classList.remove('pressed'));
                this.card(text('paused'), text('pauseHint'), [{ label: text('resume'), run: () => {
                    this.unlockAudio(); this.clearInput?.(); this.phase = this.pausedPhase; modal.hidden = true;
                    pauseButton.disabled = false;
                    canvas.focus({ preventScroll: true });
                } }]);
            },
            result(win, description, details, retry, proceed) {
                if (this.phase === 'ended') return;
                this.phase = 'ended'; this.clearInput?.(); this.held = {}; this.silence();
                pauseButton.disabled = true;
                this.card(text(win ? 'resultWin' : 'resultLose'), description,
                    [{ label: text('continue'), run: proceed }, { label: text('retry'), run: retry }], details);
            },
            bindControls(controls, action) {
                const heldCodes = new Set();
                const pointerActions = new Map();
                const buttons = new Map();
                const sync = () => {
                    for (const control of controls) {
                        this.held[control.id] = control.codes.some(code => heldCodes.has(code))
                            || [...pointerActions.values()].includes(control.id);
                        buttons.get(control.id)?.classList.toggle('pressed', this.phase === 'playing' && this.held[control.id]);
                    }
                };
                controls.forEach(control => {
                    const btn = button(text(control.label), event => {
                        // Keyboard activation of a focused button has no pointerdown.
                        if (event.detail === 0 && this.phase === 'playing') action(control.id);
                    }, 'arcade-control');
                    const source = prompts[control.icon];
                    const icon = element(source ? 'img' : 'span', 'arcade-key-icon');
                    if (source) { icon.src = source; icon.alt = control.key; }
                    else icon.textContent = control.key;
                    btn.prepend(icon); btn.setAttribute('aria-label', `${text(control.label)} (${control.key})`);
                    footer.append(btn); buttons.set(control.id, btn);
                    scope.listen(btn, 'pointerdown', event => {
                        if (event.button !== 0 || this.phase !== 'playing') return;
                        event.preventDefault(); btn.setPointerCapture(event.pointerId);
                        pointerActions.set(event.pointerId, control.id); sync();
                        btn.classList.add('pressed'); action(control.id);
                    });
                    const release = event => {
                        pointerActions.delete(event.pointerId); sync(); btn.classList.remove('pressed');
                    };
                    scope.listen(btn, 'pointerup', release);
                    scope.listen(btn, 'pointercancel', release);
                    scope.listen(btn, 'lostpointercapture', release);
                });
                scope.listen(document, 'keydown', event => {
                    if (this.phase !== 'playing' || document.hidden || !document.hasFocus()
                        || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
                    const control = controls.find(item => item.codes.includes(event.code));
                    if (!control) return;
                    // Let Tab-focused buttons retain standard Space/Enter activation.
                    if (event.target.closest?.('.arcade-button') && !event.target.closest('.arcade-control')) return;
                    event.preventDefault(); event.stopPropagation();
                    if (event.repeat) return;
                    heldCodes.add(event.code); sync(); action(control.id);
                }, true);
                scope.listen(document, 'keyup', event => { heldCodes.delete(event.code); sync(); }, true);
                const clearInput = () => {
                    heldCodes.clear(); pointerActions.clear(); this.held = {};
                    footer.querySelectorAll('.pressed').forEach(node => node.classList.remove('pressed'));
                };
                scope.listen(window, 'blur', clearInput);
                scope.listen(document, 'visibilitychange', clearInput);
                this.clearInput = clearInput;
            },
            loop(update, draw) {
                scope.fixedLoop(step => {
                    if (this.phase === 'countdown') {
                        this.countdown = Math.max(0, this.countdown - step);
                        this.notify(String(Math.max(1, Math.ceil(this.countdown / 600))), 'countdown', 100);
                        if (this.countdown === 0) {
                            this.phase = 'playing'; this.notify(text('go'), 'good', 500);
                            this.clearInput?.();
                        }
                    } else if (this.phase === 'playing') update(step);
                    this.noticeRemaining = Math.max(0, (this.noticeRemaining || 0) - step);
                    if (!this.noticeRemaining) notice.classList.remove('show');
                    if (this.phase !== 'playing') this.clearInput?.();
                }, () => {
                    // Match the fitted stage and device pixel density without changing gameplay coordinates.
                    if (resizePending) {
                        resizePending = false;
                        const rect = canvas.getBoundingClientRect();
                        const density = clamp(Math.min(rect.width / logicalWidth, rect.height / logicalHeight)
                            * (window.devicePixelRatio || 1), 1, 3);
                        const width = Math.round(logicalWidth * density), height = Math.round(logicalHeight * density);
                        if (canvas.width !== width || canvas.height !== height) {
                            canvas.width = width; canvas.height = height; this.onResize?.();
                        }
                        this.onLayout?.(rect);
                    }
                    canvas.getContext('2d').setTransform(canvas.width / logicalWidth, 0, 0, canvas.height / logicalHeight, 0, 0);
                    draw();
                }, { onPause: () => this.pause() });
            },
            unlockAudio() {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                try {
                    if (!this.sound && AudioContextClass) this.sound = new AudioContextClass();
                    this.sound?.resume().catch(() => {});
                } catch (_) { /* Visual cues remain available without an audio device. */ }
            },
            tone(frequency = 660, duration = 0.08, volume = 0.14, type = 'sine') {
                if (!this.sound || this.sound.state !== 'running' || !RuntimeState.seVolume) return;
                const oscillator = this.sound.createOscillator();
                const gain = this.sound.createGain();
                const now = this.sound.currentTime;
                oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now);
                gain.gain.setValueAtTime(0.001, now);
                gain.gain.exponentialRampToValueAtTime(Math.max(0.001, engine.getEffectiveSoundEffectVolume(volume)), now + 0.006);
                gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
                oscillator.connect(gain); gain.connect(this.sound.destination);
                oscillator.start(now); oscillator.stop(now + duration + 0.015);
                this.voices.add(oscillator);
                oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
            },
            silence() {
                this.voices.forEach(voice => { try { voice.stop(); } catch (_) { /* Already stopped. */ } });
            },
            duckBgm() {
                if (!engine.bgm || this.mutedBgm) return;
                this.mutedBgm = true;
                this.bgmWasMuted = engine.bgm.muted;
                engine.bgm.muted = true;
            },
            close() { engine.endActivity(scope); }
        };
        const pauseButton = button(`${text('pause')} · P`, () => ui.pause(), 'arcade-pause');
        pauseButton.disabled = true; ui.pauseButton = pauseButton;
        header.append(heading, pauseButton); stage.append(canvas, notice, modal);
        shell.append(header, hud, stage, footer); container.append(shell);
        scope.listen(window, 'resize', () => { resizePending = true; });
        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => { resizePending = true; });
            observer.observe(stage); scope.defer(() => observer.disconnect());
        }
        scope.listen(container, 'click', event => event.stopPropagation());
        scope.listen(document, 'keydown', event => {
            if (event.isComposing || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
            if ((event.code === 'KeyP' || event.key === 'Escape') && ['playing', 'countdown'].includes(ui.phase)) {
                event.preventDefault(); event.stopImmediatePropagation(); ui.pause();
            } else if (event.key === 'Tab' && !modal.hidden) {
                const nodes = [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
                const index = nodes.indexOf(document.activeElement);
                if (nodes.length) {
                    event.preventDefault(); nodes[(index + (event.shiftKey ? -1 : 1) + nodes.length) % nodes.length].focus();
                }
            }
        }, true);
        scope.defer(() => {
            ui.phase = 'closed'; ui.clearInput?.(); ui.silence();
            ui.sound?.close().catch(() => {});
            if (ui.mutedBgm && engine.bgm) {
                engine.bgm.muted = ui.bgmWasMuted;
                engine.updateBgmVolume();
            }
            container.classList.remove('visible'); container.inert = true;
            container.setAttribute('aria-hidden', 'true');
            container.replaceChildren(canvas);
            canvas.width = logicalWidth; canvas.height = logicalHeight;
            engine.charLayer.classList.remove('hidden'); engine.dialogueBox.classList.remove('hidden');
            if (previousFocus?.isConnected && !previousFocus.closest('.arcade-overlay')) previousFocus.focus({ preventScroll: true });
        });
        return ui;
    }

    // Rounded little fighters, rather than debug stick figures. All shapes are
    // authored in Canvas so no external character art or new font is needed.
    function fighter(ctx, p, time) {
        ctx.save(); ctx.translate(p.x, p.y);
        const direction = p.facingRight === false ? -1 : 1;
        ctx.scale(direction, 1);
        const walk = p.moving ? Math.sin(time / 85) * 7 : 0;
        const breathe = Math.sin(time / 240) * 1.5;
        ctx.fillStyle = 'rgba(7, 15, 35, .24)';
        ctx.beginPath(); ctx.ellipse(0, 2, 32, 7, 0, 0, Math.PI * 2); ctx.fill();
        if (p.hurt > 0 && Math.floor(p.hurt / 70) % 2) ctx.globalAlpha = 0.6;
        rounded(ctx, -21 + walk, -28, 14, 28, 5, '#253450');
        rounded(ctx, 7 - walk, -28, 14, 28, 5, '#253450');
        rounded(ctx, -24 + walk, -8, 21, 10, 4, '#eaf4ff');
        rounded(ctx, 4 - walk, -8, 23, 10, 4, '#eaf4ff');
        rounded(ctx, -23, -63 + breathe, 46, 39, 10, p.color);
        rounded(ctx, -15, -62 + breathe, 30, 5, 2, '#ffffffb0');
        ctx.strokeStyle = p.color; ctx.lineWidth = 13; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-19, -56);
        ctx.lineTo(-29, -38 - walk); ctx.stroke();
        const extend = p.attack ? (p.attack.elapsed < p.attack.windup ? 6
            : p.attack.elapsed < p.attack.windup + p.attack.active ? 38 : 8) : p.guarding ? 9 : 0;
        ctx.beginPath(); ctx.moveTo(18, -55); ctx.lineTo(29 + extend, -43 - (p.guarding ? 22 : 0)); ctx.stroke();
        rounded(ctx, 20 + extend, -52 - (p.guarding ? 22 : 0), 18, 18, 6, '#f7fbff');
        rounded(ctx, -37, -45 - walk, 18, 17, 6, '#f7fbff');
        ctx.fillStyle = '#ffe1cd'; ctx.beginPath(); ctx.arc(0, -82 + breathe, 23, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = p.hair || '#47566d';
        ctx.beginPath(); ctx.arc(0, -86 + breathe, 24, Math.PI, Math.PI * 2);
        ctx.lineTo(22, -79); ctx.lineTo(11, -85); ctx.lineTo(4, -76); ctx.lineTo(-8, -85); ctx.lineTo(-22, -76); ctx.fill();
        ctx.fillStyle = '#23314b';
        rounded(ctx, -10, -85 + breathe, 4, 6, 2, '#23314b'); rounded(ctx, 8, -85 + breathe, 4, 6, 2, '#23314b');
        ctx.strokeStyle = '#ac7270'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-2, -72); ctx.lineTo(5, -72); ctx.stroke();
        if (p.guarding) {
            ctx.strokeStyle = '#83d7ff'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(18, -58, 48, -1.1, 1.1); ctx.stroke();
        }
        ctx.restore();
    }
    return Object.freeze({ create, text, element, button, clamp, rounded, fighter, loadImages, promptLicense, artLicenses });
})();
