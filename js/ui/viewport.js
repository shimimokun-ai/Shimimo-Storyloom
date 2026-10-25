// Keep menu/canvas coordinates fitted; story layers follow the physical window.
(function (root, factory) {
    const viewport = factory();
    if (typeof module === 'object' && module.exports) module.exports = viewport;
    else viewport.mount(root);
})(globalThis, () => {
    const width = 1920;
    const height = 1080;

    function fit(availableWidth, availableHeight) {
        const scale = Math.max(0, Math.min(availableWidth / width, availableHeight / height));
        return { scale, width: width * scale, height: height * scale };
    }

    // Backgrounds extend beyond the fitted stage and cover the physical window.
    // Express window bounds in stage coordinates without scaling them twice.
    function backgroundFrame(availableWidth, availableHeight) {
        const { scale } = fit(availableWidth, availableHeight);
        const frameWidth = scale > 0 ? availableWidth / scale : width;
        const frameHeight = scale > 0 ? availableHeight / scale : height;
        return {
            width: frameWidth, height: frameHeight,
            left: (width - frameWidth) / 2, top: (height - frameHeight) / 2
        };
    }

    // Small UI copy must not shrink at the same rate as the artwork.
    // Bound compensation so very small windows cannot overflow every control.
    function textScale(scale) {
        return Math.min(1.5, Math.max(1, 1 / (scale || 1)));
    }

    function storyLayout(availableWidth, availableHeight) {
        const windowWidth = availableWidth > 0 ? availableWidth : width;
        const windowHeight = availableHeight > 0 ? availableHeight : height;
        const { scale } = fit(windowWidth, windowHeight);
        const frame = backgroundFrame(windowWidth, windowHeight);
        // Give narrow windows more text room, with no jump at an aspect breakpoint.
        const narrowness = Math.max(0, Math.min(1,
            (width / height - windowWidth / windowHeight) / (width / height - 1)));
        const dialogueHeight = Math.min(windowHeight * 0.4,
            Math.max(windowHeight * 0.25, 150 * Math.max(1, scale)));
        return {
            dialogueWidth: windowWidth * (0.8 + 0.12 * narrowness) / scale,
            dialogueHeight: dialogueHeight / scale,
            dialogueBottom: height - frame.top - frame.height + windowHeight * 0.05 / scale,
            // Tall windows enlarge the sprite, while its head stays within view.
            characterHeight: Math.min(windowHeight * 0.95, windowWidth * 1.6) / scale,
            textScale: Math.max(1, 0.625 / scale),
            controlScale: Math.max(1, 0.75 / scale)
        };
    }

    function mount(host) {
        const stage = host.document.getElementById('game-container');
        if (!stage) return;
        const update = () => {
            const { clientWidth, clientHeight } = host.document.documentElement;
            const { scale } = fit(clientWidth, clientHeight);
            stage.style.setProperty('--game-scale', String(scale));
            stage.style.setProperty('--ui-text-scale', String(textScale(scale)));
            const frame = backgroundFrame(clientWidth, clientHeight);
            for (const key of ['width', 'height', 'left', 'top']) {
                stage.style.setProperty(`--window-${key}`, `${frame[key]}px`);
            }
            const story = storyLayout(clientWidth, clientHeight);
            for (const key of ['dialogueWidth', 'dialogueHeight', 'dialogueBottom', 'characterHeight']) {
                const name = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
                stage.style.setProperty(`--story-${name}`, `${story[key]}px`);
            }
            stage.style.setProperty('--story-text-scale', String(story.textScale));
            stage.style.setProperty('--story-control-scale', String(story.controlScale));
        };
        update();
        host.addEventListener('resize', update);
        host.document.addEventListener('fullscreenchange', update);
    }

    return { fit, backgroundFrame, textScale, storyLayout, mount };
});
