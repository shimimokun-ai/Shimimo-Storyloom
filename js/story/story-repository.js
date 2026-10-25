const StoryRepository = (() => {
    const languageTargets = new Map();
    const sceneManifests = new Map();
    const scriptLoads = new Map();

    function defineLanguage(language, target, manifest) {
        languageTargets.set(language, target);
        sceneManifests.set(language, Object.freeze({ ...manifest }));
    }

    function registerChapter(language, chapterId, scenes) {
        const target = languageTargets.get(language);
        if (!target) throw new Error(`Story language is not registered: ${language}`);

        for (const [sceneId, commands] of Object.entries(scenes)) {
            if (Object.prototype.hasOwnProperty.call(target, sceneId)) {
                throw new Error(`Duplicate scene ID in ${language}/${chapterId}: ${sceneId}`);
            }
            target[sceneId] = commands;
        }
    }

    function getSceneSource(language, sceneId) {
        const requestedManifest = sceneManifests.get(language);
        if (requestedManifest?.[sceneId]) {
            return { language, scriptPath: requestedManifest[sceneId] };
        }

        const fallbackManifest = sceneManifests.get('zh');
        if (language !== 'zh' && language !== 'en' && fallbackManifest?.[sceneId]) {
            return { language: 'zh', scriptPath: fallbackManifest[sceneId] };
        }

        return null;
    }

    function loadScript(scriptPath) {
        if (scriptLoads.has(scriptPath)) return scriptLoads.get(scriptPath);

        const loadPromise = new Promise((resolve, reject) => {
            if (typeof document === 'undefined') {
                reject(new Error(`Cannot lazy-load story script outside the browser: ${scriptPath}`));
                return;
            }

            const script = document.createElement('script');
            script.src = scriptPath;
            script.async = false;
            script.onload = () => {
                script.remove();
                resolve();
            };
            script.onerror = () => {
                script.remove();
                scriptLoads.delete(scriptPath);
                reject(new Error(`Failed to load story script: ${scriptPath}`));
            };
            document.head.appendChild(script);
        });

        scriptLoads.set(scriptPath, loadPromise);
        return loadPromise;
    }

    async function getScene(language, sceneId) {
        const source = getSceneSource(language, sceneId);
        if (!source) return null;

        const target = languageTargets.get(source.language);
        if (!Object.prototype.hasOwnProperty.call(target, sceneId)) {
            await loadScript(source.scriptPath);
        }
        return target[sceneId] || null;
    }

    function getManifest(language) {
        return sceneManifests.get(language) || Object.freeze({});
    }

    return Object.freeze({ defineLanguage, registerChapter, getScene, getManifest });
})();
