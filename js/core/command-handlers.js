const CommandHandlers = Object.freeze({
    dialogue(engine, command) {
        AchievementManager.meet(command.speaker);
        engine.resetNonSpeakers(command.speaker);

        const speakingChar = GameConfig.characters?.[command.speaker];
        if (speakingChar?.sprites?.talk) {
            const charImg = document.getElementById(`char-${command.speaker}`);
            if (charImg) {
                const currentSrc = charImg.src;
                const isDefault = speakingChar.sprites.default && currentSrc.includes(speakingChar.sprites.default);
                const isNormal = speakingChar.sprites.normal && currentSrc.includes(speakingChar.sprites.normal);
                if (isDefault || isNormal) engine.updateCharacterExpression(command.speaker, 'talk');
            }
        }

        engine.currentSpeaker = command.speaker;
        engine.showDialogue(command);
    },

    background(engine, command) {
        engine.changeBackground(command.asset, () => engine.advanceCommand());
    },

    showCharacter(engine, command) {
        engine.showCharacter(command);
        engine.advanceCommand();
    },

    hideCharacter(engine, command) {
        engine.hideCharacter(command.id);
        engine.advanceCommand();
    },

    moveCharacter(engine) {
        engine.advanceCommand();
    },

    hairFlip(engine) {
        engine.advanceCommand();
    },

    wait(engine, command) {
        engine.waitForCommand(command.duration);
    },

    choice(engine, command) {
        if (engine.isAutoPlaying) {
            engine.isAutoPlaying = false;
            if (engine.autoBtn) engine.autoBtn.classList.remove('active');
        }
        engine.showChoices(command.options);
    },

    jump(engine, command) {
        const achievement = AchievementCatalog.storyAchievement(engine.currentSceneId, command);
        if (achievement) AchievementManager.unlock(achievement);
        engine.loadScene(command.target);
    },

    chapter(engine, command) {
        engine.showChapterTransition(command.title, () => engine.advanceCommand());
    },

    sceneEnd(engine, command) {
        SaveManager.set('cleared', true);
        engine.updateChatUnlockState?.();
        SaveManager.set('intro_played', true, { session: true });
        SaveManager.set('skip_next_intro', true);
        engine.showSystemModal(command.text || engine.t('demoEnd'), () => engine.returnToTitle());
    },

    endingCredits(engine, command) {
        // Only the actual story command awards this, not a credits UI preview.
        AchievementManager.unlock('story_complete');
        engine.startEndingCredits(command, () => engine.advanceCommand());
    },

    cg(engine, command) {
        engine.showCG(command.asset, () => engine.advanceCommand(), command.waitForClick);
    },

    sound(engine, command) {
        engine.playSoundEffect(command.asset, command.volume, command.duration);
        engine.advanceCommand();
    },

    bgm(engine, command) {
        engine.playBgm(command.asset, command.volume);
        engine.advanceCommand();
    },

    minigame(engine, command) {
        if (!GameConfig.features.minigames) { engine.loadScene(command.targetSuccess); return; }
        engine.startRhythmGame(command.targetSuccess, command.targetFail);
    },

    fighting(engine, command) {
        if (!GameConfig.features.minigames) { engine.loadScene(command.targetNext); return; }
        engine.startFightingGame(command.targetNext);
    },

    dodgeball(engine) {
        if (!GameConfig.features.minigames) { engine.advanceCommand(); return; }
        engine.startDodgeballGame();
    },

    writing(engine) {
        if (!GameConfig.features.minigames) { engine.advanceCommand(); return; }
        engine.startWritingGame();
    },

    setFlag(engine, command) {
        RuntimeState.setFlag(command.key, command.value);
        engine.advanceCommand();
    },

    checkFlag(engine, command) {
        const target = RuntimeState.getFlag(command.key) === command.value
            ? command.targetTrue
            : command.targetFalse;
        engine.loadScene(target);
    },

    unlockGallery(engine) {
        if (!SaveManager.get('gallery_unlocked', false)) SaveManager.set('gallery_unlocked', true);
        engine.advanceCommand();
    },

    stopSound(engine) {
        engine.stopAllSoundEffects();
        engine.advanceCommand();
    },

    effect(engine, command) {
        engine.playEffect(command.name, () => engine.advanceCommand());
    },

    unknown(engine, command) {
        console.warn(`Unknown command: ${command.type}`);
        engine.advanceCommand();
    }
});
