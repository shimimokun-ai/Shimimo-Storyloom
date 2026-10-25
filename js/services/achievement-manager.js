// Browser fallback and sandbox-safe Electron bridge. Story saves are never used as evidence.
const AchievementManager = (() => {
    const Catalog = AchievementCatalog;
    const storageKey = `${GameConfig.project.id}_achievements_v1`; // Independent from story progress.
    const bridge = window.electronAPI;
    let state = Catalog.normalize(null);
    let status = { platform: bridge?.getAchievements ? 'steam' : 'local', reason: 'loading' };
    let suspended = false;
    const queued = new Set();
    const notices = [];
    let showingNotice = false;
    const words = {
        zh: { title: '成就', unlocked: '成就解锁', locked: '未解锁', earned: '已解锁',
            local: '本地模式', steam: 'Steam 已连接',
            pending: 'Steam 同步待重试', error: '成就服务暂不可用，请重启游戏重试',
            save: '成就保存失败，请检查磁盘空间和权限', debug: '调试模式 · 本次会话不解锁成就',
            loading: '正在读取成就…', account: 'Steam 账号已变化，请重启游戏', note: '成就独立保存，不随剧情存档清除。' },
        ja: { title: '実績', unlocked: '実績解除', locked: '未解除', earned: '解除済み',
            local: 'ローカルモード', steam: 'Steam 接続中',
            pending: 'Steam 同期の再試行待ち', error: '実績サービスに接続できません。ゲームを再起動してください',
            save: '実績を保存できません。空き容量と権限をご確認ください', debug: 'デバッグモード · 今回は実績を解除しません',
            loading: '実績を読み込み中…', account: 'Steam アカウントが変わりました。再起動してください', note: '実績はセーブデータとは別に保存されます。' },
        en: { title: 'Achievements', unlocked: 'Achievement unlocked', locked: 'Locked', earned: 'Unlocked',
            local: 'Local mode', steam: 'Steam connected',
            pending: 'Steam sync pending retry', error: 'Achievement service unavailable. Please restart the game',
            save: 'Cannot save achievements. Check disk space and permissions', debug: 'Debug mode · Achievements disabled for this session',
            loading: 'Loading achievements…', account: 'Steam account changed. Please restart the game', note: 'Achievements are stored separately from story saves.' }
    };
    const language = () => words[RuntimeState.language] ? RuntimeState.language : 'zh';
    function accept(result) {
        state = Catalog.normalize(result.state);
        status = result;
        render();
    }
    const ready = (async () => {
        try {
            if (bridge?.getAchievements) accept(await bridge.getAchievements());
            else {
                state = Catalog.normalize(JSON.parse(window.localStorage.getItem(storageKey) || 'null'));
                status = { platform: 'local', reason: null };
                // Persist encounter-based backfill silently; don't flood startup with achievement toasts.
                try { window.localStorage.setItem(storageKey, JSON.stringify(state)); }
                catch { status.saveFailed = true; }
            }
        } catch (error) {
            console.warn('Unable to initialize achievements.', error);
            status = { platform: 'local', reason: bridge?.getAchievements ? 'error' : null };
        }
        render();
    })();
    let queue = ready;
    function record(event) {
        if (suspended || !Catalog.validEvent(event)) return Promise.resolve();
        const key = `${event.type}:${event.id}`;
        if (queued.has(key)) return queue;
        queued.add(key);
        queue = queue.then(async () => {
            if (suspended) return;
            if (event.type === 'meet' && state.met.includes(event.id)) return;
            if (event.type === 'unlock' && state.unlocked[event.id]) return;
            let unlocked;
            if (bridge?.recordAchievement) {
                const result = await bridge.recordAchievement(event);
                accept(result);
                unlocked = result.newlyUnlocked || [];
            } else {
                unlocked = Catalog.apply(state, event);
                try {
                    window.localStorage.setItem(storageKey, JSON.stringify(state));
                    status.saveFailed = false;
                } catch { status.saveFailed = true; }
                render();
            }
            unlocked.forEach(id => notices.push(id));
            showNextNotice();
        }).catch(error => {
            console.warn('Unable to record achievement.', error);
            status.reason = 'error';
            render();
        }).finally(() => queued.delete(key));
        return queue;
    }
    function showNextNotice() {
        if (showingNotice || !notices.length || !document.body) return;
        const item = Catalog.definitions.find(entry => entry.id === notices.shift());
        if (!item) return showNextNotice();
        showingNotice = true;
        const lang = language();
        const toast = document.createElement('aside');
        toast.className = 'achievement-toast';
        toast.setAttribute('role', 'status');
        const text = document.createElement('div');
        const label = document.createElement('small');
        label.textContent = words[lang].unlocked;
        const name = document.createElement('strong');
        name.textContent = item[lang].name;
        text.append(label, name);
        if (item.icon) {
            const icon = document.createElement('img');
            icon.src = item.icon;
            icon.alt = '';
            toast.appendChild(icon);
        }
        toast.appendChild(text);
        (document.getElementById('game-container') || document.body).appendChild(toast);
        setTimeout(() => { toast.remove(); showingNotice = false; showNextNotice(); }, 4500);
    }
    function render() {
        const lang = language();
        const w = words[lang];
        const tab = document.getElementById('settings-tab-achievements');
        if (tab) tab.textContent = w.title;
        const list = document.getElementById('achievement-list');
        const label = document.getElementById('achievement-status');
        if (!list || !label) return;
        const reason = status.reason;
        const message = suspended ? w.debug : status.saveFailed ? w.save
            : reason === 'account-changed' ? w.account : reason === 'error' ? w.error
            : reason === 'loading' ? w.loading : reason === 'pending' ? w.pending : w[status.platform];
        label.textContent = `${Object.keys(state.unlocked).length} / ${Catalog.definitions.length} · ${message}`;
        list.replaceChildren();
        for (const item of Catalog.definitions) {
            const earned = Boolean(state.unlocked[item.id]);
            const card = document.createElement('article');
            card.className = `achievement-card${earned ? ' is-earned' : ''}`;
            const source = earned ? item.icon : item.lockedIcon;
            const content = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = `${item[lang].name} · ${earned ? w.earned : w.locked}`;
            content.appendChild(title);
            if (item[lang].description) {
                const description = document.createElement('p');
                description.textContent = item[lang].description;
                content.appendChild(description);
            }
            if (source) {
                const icon = document.createElement('img');
                icon.src = source;
                icon.alt = '';
                card.appendChild(icon);
            }
            card.appendChild(content);
            list.appendChild(card);
        }
    }
    async function refresh() {
        await queue;
        if (bridge?.getAchievements) {
            try { accept(await bridge.getAchievements()); }
            catch { status.reason = 'error'; }
        } else if (status.saveFailed) {
            try { window.localStorage.setItem(storageKey, JSON.stringify(state)); status.saveFailed = false; }
            catch { /* Keep the visible persistence warning until a later retry succeeds. */ }
        }
        render();
    }
    return Object.freeze({ meet: id => record({ type: 'meet', id }), unlock: id => record({ type: 'unlock', id }),
        refresh, render, suspendForDebug() { suspended = true; render(); } });
})();
