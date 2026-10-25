class ActivityScope {
    constructor() {
        this.timers = new Set();
        this.animationFrames = new Set();
        this.listeners = [];
        this.cleanups = new Set();
        this.closed = false;
    }

    listen(target, type, handler, options) {
        if (this.closed) return handler;
        target.addEventListener(type, handler, options);
        this.listeners.push({ target, type, handler, options });
        return handler;
    }

    timeout(callback, delay) {
        if (this.closed) return null;
        const timer = setTimeout(() => {
            this.timers.delete(timer);
            if (!this.closed) callback();
        }, delay);
        this.timers.add(timer);
        return timer;
    }

    interval(callback, delay) {
        if (this.closed) return null;
        const timer = setInterval(() => {
            if (!this.closed) callback();
        }, delay);
        this.timers.add(timer);
        return timer;
    }

    animationFrame(callback) {
        if (this.closed) return null;
        const frame = requestAnimationFrame((timestamp) => {
            this.animationFrames.delete(frame);
            if (!this.closed) callback(timestamp);
        });
        this.animationFrames.add(frame);
        return frame;
    }

    // Keep gameplay at the original 60 Hz pace, independently of rendering.
    fixedLoop(update, draw, { onPause = () => {} } = {}) {
        const step = 1000 / 60;
        let previous = null;
        let accumulator = 0;
        let paused = Boolean(document.hidden) || (document.hasFocus ? !document.hasFocus() : false);
        const reset = () => {
            previous = null;
            accumulator = 0;
            onPause();
        };
        const view = document.defaultView;
        if (view) {
            this.listen(view, 'blur', () => { paused = true; reset(); });
            this.listen(view, 'focus', () => { paused = Boolean(document.hidden); reset(); });
        }
        this.listen(document, 'visibilitychange', () => {
            paused = Boolean(document.hidden) || (document.hasFocus ? !document.hasFocus() : false);
            reset();
        });
        const frame = timestamp => {
            if (this.closed) return;
            if (!paused) {
                if (previous !== null) accumulator += Math.max(0, Math.min(100, timestamp - previous));
                previous = timestamp;
                while (accumulator + 1e-7 >= step && !this.closed) {
                    accumulator -= step;
                    update(step);
                }
                if (!this.closed) draw(timestamp);
            }
            if (!this.closed) this.animationFrame(frame);
        };
        this.animationFrame(frame);
    }

    clearTimer(timer) {
        if (timer === null || timer === undefined) return;
        clearTimeout(timer);
        this.timers.delete(timer);
    }

    clearAnimationFrame(frame) {
        if (frame === null || frame === undefined) return;
        cancelAnimationFrame(frame);
        this.animationFrames.delete(frame);
    }

    defer(cleanup) {
        if (this.closed) cleanup();
        else this.cleanups.add(cleanup);
        return cleanup;
    }

    clear() {
        this.closed = true;
        this.timers.forEach((timer) => clearTimeout(timer));
        this.animationFrames.forEach((frame) => cancelAnimationFrame(frame));
        this.listeners.forEach(({ target, type, handler, options }) => {
            target.removeEventListener(type, handler, options);
        });
        this.timers.clear();
        this.animationFrames.clear();
        this.listeners = [];
        this.cleanups.forEach((cleanup) => {
            try { cleanup(); } catch (error) { console.warn('Activity cleanup failed.', error); }
        });
        this.cleanups.clear();
    }
}
