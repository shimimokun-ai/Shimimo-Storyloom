const fs = require('fs');
const path = require('path');
const Catalog = require('../js/data/achievements');

// Native SDK access stays in the main process. No credentials or arbitrary SDK calls cross IPC.
function createSteamAchievements({ userData, appId, loadSteam = () => require('steamworks.js'), logger = console }) {
    let client = null;
    let accountId = null;
    let reason = 'not-configured';
    if (Number.isInteger(appId) && appId > 0 && appId !== 480) {
        try {
            client = loadSteam().init(appId);
            if (client.utils.getAppId() !== appId) throw new Error('Steam App ID mismatch');
            accountId = client.localplayer.getSteamId().steamId64.toString();
            if (!/^[1-9]\d{15,19}$/.test(accountId)) throw new Error('Invalid Steam account');
            reason = null;
        } catch (error) {
            logger.warn('Steam unavailable; achievements will remain local.', error.message);
            client = null;
            accountId = null;
            reason = 'unavailable';
        }
    }
    // Never transfer anonymous/browser/development unlocks to another Steam account.
    const scope = accountId ? `steam_${appId}_${accountId}` : 'local';
    const file = path.join(userData, 'achievements', `${scope}.json`);
    let state = Catalog.normalize(null);
    let migrated = false;
    try {
        const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
        state = Catalog.normalize(raw);
        migrated = JSON.stringify(raw) !== JSON.stringify(state);
    }
    catch (error) {
        if (error.code !== 'ENOENT') logger.warn('Unable to read achievements.', error.message);
    }
    let saveFailed = false;
    let lastAttempt = 0;
    let submitting = false;
    function persist() {
        try {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(`${file}.tmp`, JSON.stringify(state, null, 2), 'utf8');
            fs.renameSync(`${file}.tmp`, file);
            saveFailed = false;
        } catch (error) {
            saveFailed = true;
            logger.warn('Unable to persist achievements; keeping them in memory.', error.message);
        }
    }
    function sameAccount() {
        return client && client.utils.getAppId() === appId
            && client.localplayer.getSteamId().steamId64.toString() === accountId;
    }
    if (migrated) persist();
    function sync(force = false) {
        if (saveFailed) persist();
        if (!client || submitting || (!force && Date.now() - lastAttempt < 15000)) return;
        submitting = true;
        lastAttempt = Date.now();
        try {
            if (!sameAccount()) { reason = 'account-changed'; return; }
            reason = null;
            let changed = false;
            let accepted = true;
            for (const item of Catalog.definitions) {
                if (client.achievement.isActivated(item.steamId)) {
                    if (!state.unlocked[item.id]) {
                        state.unlocked[item.id] = new Date().toISOString();
                        changed = true;
                    }
                } else if (state.unlocked[item.id]) {
                    accepted = client.achievement.activate(item.steamId) && accepted;
                }
            }
            // isActivated reads the local Steam cache; it is NOT a server acknowledgement.
            // Retain all earned records and resubmit StoreStats on later attempts/startups.
            if (Object.keys(state.unlocked).length) accepted = client.stats.store() && accepted;
            if (!accepted) reason = 'pending';
            if (changed || saveFailed) persist();
        } catch (error) {
            reason = 'pending';
            logger.warn('Achievement synchronization pending.', error.message);
        } finally { submitting = false; }
    }
    function snapshot() {
        return { state: Catalog.normalize(state), platform: client ? 'steam' : 'local',
            scope, reason, saveFailed };
    }
    function record(event) {
        if (!Catalog.validEvent(event)) throw new TypeError('Invalid achievement event.');
        // Do not award the old account when Steam changes account during a running session.
        try {
            if (client && !sameAccount()) return { ...snapshot(), reason: 'account-changed', newlyUnlocked: [] };
        } catch { return { ...snapshot(), reason: 'pending', newlyUnlocked: [] }; }
        const before = JSON.stringify(state);
        const newlyUnlocked = Catalog.apply(state, event);
        if (before !== JSON.stringify(state) || saveFailed) persist();
        if (newlyUnlocked.length) sync(true);
        return { ...snapshot(), newlyUnlocked };
    }
    return { snapshot, record, sync };
}
module.exports = { createSteamAchievements };
