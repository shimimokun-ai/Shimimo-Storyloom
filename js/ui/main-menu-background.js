// Project-configured backgrounds. CSS paints need no image files or network access.
const MainMenuBackground = class MainMenuBackground {
    static get backgrounds() { return GameConfig.mainMenuBackgrounds?.length ? GameConfig.mainMenuBackgrounds : ['#e8edf6']; }
    static get indices() { return this.backgrounds.map((_, index) => index); }
    static get defaultIndex() { return 0; }
    static normalize(index) { const value = Number(index); return this.indices.includes(value) ? value : 0; }
    static next(index) { return (this.normalize(index) + 1) % this.backgrounds.length; }

    constructor(container, { host = globalThis, onChange = () => {} } = {}) {
        Object.assign(this, { container, host, onChange, current: null, target: null, visibleImage: null, pending: null });
    }

    request(index) {
        this.target = MainMenuBackground.normalize(index);
        if (!this.pending) this.pending = this.drain().finally(() => { this.pending = null; });
        return this.pending;
    }

    async drain() {
        while (this.current !== this.target) {
            const index = this.target;
            const source = MainMenuBackground.backgrounds[index];
            let layer;
            try {
                if (source.startsWith('#') || /^(?:linear|radial)-gradient\(/.test(source)) {
                    layer = document.createElement('div');
                    layer.style.background = source;
                } else {
                    layer = new this.host.Image();
                    layer.alt = '';
                    await new Promise((resolve, reject) => { layer.onload = resolve; layer.onerror = reject; layer.src = source; });
                    if (layer.decode) await layer.decode();
                }
                if (index !== this.target) continue;
                layer.className = 'main-menu-background';
                this.container.prepend(layer);
                this.visibleImage?.remove();
                this.visibleImage = layer;
                this.current = index;
                this.onChange(index);
            } catch (error) {
                layer?.remove();
                this.host.console.warn('Unable to load menu background:', error);
                if (index === this.target) return;
            }
        }
    }
};
