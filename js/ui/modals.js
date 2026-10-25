const ModalMethods = {
    returnToTitle() {
        // Desktop navigation stays in the trusted main process. Reloading keeps
        // persisted progress/settings and clears timers, voices and overlays.
        if (window.electronAPI?.returnToTitle) {
            return window.electronAPI.returnToTitle().catch(error => {
                console.error('Unable to return to title:', error);
            });
        }
        window.location.reload();
    },

    showSystemModal(text, onOk = null) {
        if (!this.sysModal) return;
        this.enterOverlay('system-modal');
        this.sysText.innerText = text;
        this.sysModal.classList.add('visible');
        this.onModalOk = onOk;
    },

    closeSystemModal() {
        if (!this.sysModal) return;
        this.sysModal.classList.remove('visible');
        this.leaveOverlay('system-modal', GameState.DIALOGUE);
        if (this.onModalOk) {
            this.onModalOk();
            this.onModalOk = null;
        }
    },

    showConfirmModal(text, onConfirm, onCancel = null) {
        if (!this.confirmModal) return;
        if (this.autoTimeout != null) clearTimeout(this.autoTimeout);
        this.autoTimeout = null;
        this.enterOverlay('confirm-modal');
        this.confirmText.innerText = text;
        this.confirmModal.classList.add('visible');

        // Clean up old listeners to prevent stacking
        const newOk = this.confirmOk.cloneNode(true);
        this.confirmOk.parentNode.replaceChild(newOk, this.confirmOk);
        this.confirmOk = newOk;

        this.confirmOk.addEventListener('click', () => {
            this.closeConfirmModal({ resumeAuto: false });
            if (onConfirm) onConfirm();
        });

        // Cancel is handled by global bind on closeConfirmModal,
        // but if we need specific onCancel action:
        const newCancel = this.confirmCancel.cloneNode(true);
        this.confirmCancel.parentNode.replaceChild(newCancel, this.confirmCancel);
        this.confirmCancel = newCancel;

        this.confirmCancel.addEventListener('click', () => {
            this.closeConfirmModal();
            if (onCancel) onCancel();
        });
    },

    closeConfirmModal({ resumeAuto = true } = {}) {
        if (!this.confirmModal) return;
        this.confirmModal.classList.remove('visible');
        this.leaveOverlay('confirm-modal', GameState.DIALOGUE);
        if (resumeAuto) this.maybeScheduleAutoAdvance();
    }
};
