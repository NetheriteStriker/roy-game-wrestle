import {
  playAchievement,
  playButtonClick,
  playCoin,
  playDefeat,
  playVictory,
  startMusic,
  stopMusic,
  unlockAudioOnGesture
} from './audio.js';
import { startCombatSession } from './combat.js';
import {
  ABILITIES,
  DIFFICULTY_MAP,
  LEVELS_PER_PRIX,
  LEVEL_PASS_COINS,
  ROUND_CLEAR_ATTACK_BONUS,
  ROUNDS_PER_LEVEL,
  ROUND_WIN_COINS
} from './constants.js';
import { getEnemyForRound } from './enemies.js';
import { createHomeScene } from './homeScene.js';
import { startAerialBattle } from './minigames/aerialBattle.js';
import { startDemolisherRun } from './minigames/demolisherRun.js';
import { startPunchingTargets } from './minigames/punchingTargets.js';
import {
  awardCoins,
  clearActivePrix,
  getSave,
  recordCompletedGrandPrix,
  recordStat,
  saveActivePrix,
  setMuted,
  unlockAchievement,
  unlockPermanentBulletPunch
} from './storage.js';
import {
  hideModal,
  renderAchievements,
  renderDifficultyCards,
  showAchievementToast,
  showControlsModal,
  showModal,
  showScreen,
  updateCombatHud,
  updateMiniGameHud,
  updateTopBar
} from './ui.js';

const homeScene = createHomeScene(document.getElementById('home-canvas'));
let activeCombat = null;
let activeMiniGame = null;
let currentPrix = null;

function notifyUnlocked(list) {
  if (!list || list.length === 0) return;
  playAchievement();
  for (const ach of list) {
    if (ach) showAchievementToast(ach);
  }
  updateTopBar();
}

function cleanupActiveGameplay() {
  if (activeCombat) {
    activeCombat.destroy();
    activeCombat = null;
  }
  if (activeMiniGame) {
    activeMiniGame.destroy();
    activeMiniGame = null;
  }
  stopMusic();
}

function goHome() {
  cleanupActiveGameplay();
  hideModal();
  updateTopBar();
  showScreen('screen-home');
  homeScene.start();
}

function createNewPrix(difficulty) {
  const save = getSave();
  const prix = {
    difficultyId: difficulty.id,
    level: 1,
    round: 1,
    levelCoins: 0,
    attackBonus: 0,
    levelStartAttackBonus: 0,
    unlockedAbilities: {
      gauntlet: false,
      brickThrow: false,
      flight: false,
      bulletPunch: Boolean(save.permanentUnlocks.bulletPunch)
    },
    levelFlags: {
      skippedAny: false,
      losses: 0,
      kicksUsed: false
    }
  };
  saveActivePrix(prix);
  return prix;
}

function startGrandPrixRound(prix) {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  cleanupActiveGameplay();
  homeScene.stop();
  hideModal();

  currentPrix = prix;
  saveActivePrix(currentPrix);
  updateTopBar();
  showScreen('screen-combat');

  const diff = DIFFICULTY_MAP[currentPrix.difficultyId];
  const enemyConfig = getEnemyForRound(currentPrix.level, currentPrix.round, diff);
  startMusic('arena');

  activeCombat = startCombatSession({
    canvas: document.getElementById('combat-canvas'),
    enemyConfig,
    attackBonus: currentPrix.attackBonus,
    abilities: currentPrix.unlockedAbilities,
    level: currentPrix.level,
    round: currentPrix.round,
    difficultyName: diff.name,
    onHudUpdate: (hudState) => updateCombatHud(currentPrix, hudState),
    onPunchLanded: () => notifyUnlocked(recordStat('punchesLanded', 1)),
    onKickLanded: () => notifyUnlocked(recordStat('kicksLanded', 1)),
    onKickUsed: () => {
      if (!currentPrix.levelFlags.kicksUsed) {
        currentPrix.levelFlags.kicksUsed = true;
        saveActivePrix(currentPrix);
      }
    },
    onGrabLanded: () => notifyUnlocked(recordStat('grabsLanded', 1)),
    onSpin10Seconds: () => {
      const ach = unlockAchievement('spin_10s');
      if (ach) notifyUnlocked([ach]);
    },
    onVictory: () => handleRoundOutcome(true),
    onDefeat: () => handleRoundOutcome(false)
  });
}

function handleRoundOutcome(won) {
  if (won) {
    playVictory();
    playCoin();
    currentPrix.levelCoins += ROUND_WIN_COINS;
    currentPrix.attackBonus += ROUND_CLEAR_ATTACK_BONUS;
    awardCoins(ROUND_WIN_COINS);
    saveActivePrix(currentPrix);
    updateTopBar();

    const isLastRound = currentPrix.round >= ROUNDS_PER_LEVEL;
    showModal({
      title: `Round ${currentPrix.round} Victory!`,
      bodyHtml: `
        <p>Demolisher wins the bout!</p>
        <p><strong>+${ROUND_WIN_COINS} Coins</strong> earned (Level Total: <strong>${currentPrix.levelCoins} / ${LEVEL_PASS_COINS}</strong>)</p>
        <p><strong>+${ROUND_CLEAR_ATTACK_BONUS} Permanent Attack Damage</strong> (Current Bonus: +${currentPrix.attackBonus})</p>
      `,
      actions: [
        {
          label: isLastRound ? 'Complete Level Check' : `Next: Round ${currentPrix.round + 1}`,
          variant: 'arcade-btn--gold',
          onClick: () => {
            playButtonClick();
            advanceAfterRound();
          }
        }
      ]
    });
  } else {
    playDefeat();
    currentPrix.levelFlags.losses += 1;
    saveActivePrix(currentPrix);

    showModal({
      title: `Round ${currentPrix.round} Defeat`,
      bodyHtml: `<p>Demolisher was knocked out! Choose whether to rematch or skip this round.</p>`,
      warningText:
        'Skipping forfeits the 100-coin reward and disqualifies you from earning level-completion achievements on this level.',
      actions: [
        {
          label: 'Rematch',
          sub: 'Full 2,000 HP',
          variant: 'arcade-btn--primary',
          onClick: () => {
            playButtonClick();
            startGrandPrixRound(currentPrix);
          }
        },
        {
          label: 'Skip Round',
          sub: '0 Coins • No Level Ach.',
          variant: 'arcade-btn--cyan',
          onClick: () => {
            playButtonClick();
            currentPrix.levelFlags.skippedAny = true;
            saveActivePrix(currentPrix);
            advanceAfterRound();
          }
        }
      ]
    });
  }
}

function advanceAfterRound() {
  if (currentPrix.round < ROUNDS_PER_LEVEL) {
    currentPrix.round += 1;
    startGrandPrixRound(currentPrix);
    return;
  }

  // End of Level (Round 10 finished) -> Check 700-Coin Gate
  if (currentPrix.levelCoins < LEVEL_PASS_COINS) {
    showModal({
      title: `Level ${currentPrix.level} Gate Not Met`,
      bodyHtml: `
        <p>You earned <strong>${currentPrix.levelCoins} Coins</strong>, but at least <strong>${LEVEL_PASS_COINS} Coins</strong> (7 of 10 wins) are required to advance.</p>
        <p>Coins reset to 0 when retrying the level.</p>
      `,
      actions: [
        {
          label: `Retry Level ${currentPrix.level}`,
          variant: 'arcade-btn--primary',
          onClick: () => {
            playButtonClick();
            currentPrix.round = 1;
            currentPrix.levelCoins = 0;
            currentPrix.attackBonus = currentPrix.levelStartAttackBonus;
            currentPrix.levelFlags = { skippedAny: false, losses: 0, kicksUsed: false };
            startGrandPrixRound(currentPrix);
          }
        },
        {
          label: 'Return Home',
          variant: 'arcade-btn--cyan',
          onClick: () => {
            playButtonClick();
            goHome();
          }
        }
      ]
    });
    return;
  }

  // Passed Level Gate! Award Level-completion achievements if no rounds were skipped
  if (!currentPrix.levelFlags.skippedAny) {
    const unlockedBatch = [];
    if (!currentPrix.levelFlags.kicksUsed) {
      const noKick = unlockAchievement('level_no_kick');
      if (noKick) unlockedBatch.push(noKick);
    }
    if (currentPrix.levelFlags.losses === 0) {
      const flawless = unlockAchievement('level_flawless');
      if (flawless) unlockedBatch.push(flawless);
    }
    notifyUnlocked(unlockedBatch);
  }

  const clearedLevel = currentPrix.level;
  const rewardAbility = ABILITIES.find((a) => a.unlockLevel === clearedLevel);
  if (rewardAbility) {
    currentPrix.unlockedAbilities[rewardAbility.id] = true;
    if (rewardAbility.id === 'bulletPunch') {
      unlockPermanentBulletPunch();
    }
  }

  if (clearedLevel >= LEVELS_PER_PRIX) {
    // Grand Prix Champion!
    const prixUnlocked = recordCompletedGrandPrix(currentPrix.difficultyId);
    notifyUnlocked(prixUnlocked);
    const diff = DIFFICULTY_MAP[currentPrix.difficultyId];
    clearActivePrix();
    updateTopBar();
    playVictory();

    showModal({
      title: 'GRAND PRIX CHAMPION!',
      bodyHtml: `
        <p>Demolisher conquered all 4 Levels on <strong>${diff.name}</strong> difficulty!</p>
        <p>Unlocked Final Ability: <strong>${rewardAbility.name} (${rewardAbility.keyLabel})</strong> — now permanently available in new Grand Prix tournaments!</p>
      `,
      actions: [
        {
          label: 'Back to Home',
          variant: 'arcade-btn--gold',
          onClick: () => {
            playButtonClick();
            goHome();
          }
        }
      ]
    });
    return;
  }

  // Advance to next Level (coins reset to 0)
  currentPrix.level += 1;
  currentPrix.round = 1;
  currentPrix.levelCoins = 0;
  currentPrix.levelStartAttackBonus = currentPrix.attackBonus;
  currentPrix.levelFlags = { skippedAny: false, losses: 0, kicksUsed: false };
  saveActivePrix(currentPrix);

  showModal({
    title: `Level ${clearedLevel} Complete!`,
    bodyHtml: `
      <p><strong>${rewardAbility.name} (${rewardAbility.keyLabel})</strong> unlocked!</p>
      <p>${rewardAbility.description}</p>
      <p class="muted" style="margin-top:8px">Level coin balance resets to 0 for Level ${currentPrix.level}.</p>
    `,
    actions: [
      {
        label: `Enter Level ${currentPrix.level}`,
        variant: 'arcade-btn--gold',
        onClick: () => {
          playButtonClick();
          startGrandPrixRound(currentPrix);
        }
      }
    ]
  });
}

function launchMiniGame(kind) {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  cleanupActiveGameplay();
  homeScene.stop();
  hideModal();
  showScreen('screen-minigame-play');

  const canvas = document.getElementById('minigame-canvas');
  startMusic('minigame');

  if (kind === 'punching') {
    activeMiniGame = startPunchingTargets({
      canvas,
      onHudUpdate: updateMiniGameHud,
      onPunchLanded: () => notifyUnlocked(recordStat('punchesLanded', 1)),
      onComplete: ({ hits, coinsEarned }) => {
        if (coinsEarned > 0) {
          awardCoins(coinsEarned);
          updateTopBar();
        }
        showModal({
          title: 'Time Up — Punching Targets!',
          bodyHtml: `<p>You smashed <strong>${hits} targets</strong> and earned <strong>${coinsEarned.toLocaleString()} Coins</strong>!</p>`,
          actions: [
            {
              label: 'Play Again',
              variant: 'arcade-btn--gold',
              onClick: () => {
                playButtonClick();
                launchMiniGame('punching');
              }
            },
            {
              label: 'Mini Games Menu',
              variant: 'arcade-btn--cyan',
              onClick: () => {
                playButtonClick();
                cleanupActiveGameplay();
                hideModal();
                showScreen('screen-minigames');
              }
            }
          ]
        });
      }
    });
  } else if (kind === 'run') {
    activeMiniGame = startDemolisherRun({
      canvas,
      onHudUpdate: updateMiniGameHud,
      onComplete: ({ won, reason, coinsEarned, progressPct, timeTaken }) => {
        if (coinsEarned > 0) {
          awardCoins(coinsEarned);
          updateTopBar();
        }
        showModal({
          title: won ? 'Finish Line Cleared!' : 'Run Failed!',
          bodyHtml: won
            ? `<p>Demolisher outran the pack in <strong>${timeTaken}s</strong> and earned <strong>${coinsEarned} Coins</strong>!</p>`
            : `<p>${reason}</p><p>Course Progress: <strong>${progressPct}%</strong></p>`,
          actions: [
            {
              label: 'Run Again',
              variant: 'arcade-btn--primary',
              onClick: () => {
                playButtonClick();
                launchMiniGame('run');
              }
            },
            {
              label: 'Mini Games Menu',
              variant: 'arcade-btn--cyan',
              onClick: () => {
                playButtonClick();
                cleanupActiveGameplay();
                hideModal();
                showScreen('screen-minigames');
              }
            }
          ]
        });
      }
    });
  } else if (kind === 'aerial') {
    activeMiniGame = startAerialBattle({
      canvas,
      onHudUpdate: updateMiniGameHud,
      onPunchLanded: () => notifyUnlocked(recordStat('punchesLanded', 1)),
      onKickLanded: () => notifyUnlocked(recordStat('kicksLanded', 1)),
      onGrabLanded: () => notifyUnlocked(recordStat('grabsLanded', 1)),
      onComplete: ({ won, coinsEarned, enemyName }) => {
        if (coinsEarned > 0) {
          awardCoins(coinsEarned);
          updateTopBar();
        }
        showModal({
          title: won ? 'Aerial Victory!' : 'Grounded in Mid-Air!',
          bodyHtml: won
            ? `<p>Demolisher defeated <strong>${enemyName}</strong> in free-fall and won <strong>${coinsEarned} Coins</strong>!</p>`
            : `<p><strong>${enemyName}</strong> got the upper hand in the sky. Try again!</p>`,
          actions: [
            {
              label: won ? 'Next Challenger' : 'Rematch',
              variant: 'arcade-btn--purple',
              onClick: () => {
                playButtonClick();
                launchMiniGame('aerial');
              }
            },
            {
              label: 'Mini Games Menu',
              variant: 'arcade-btn--cyan',
              onClick: () => {
                playButtonClick();
                cleanupActiveGameplay();
                hideModal();
                showScreen('screen-minigames');
              }
            }
          ]
        });
      }
    });
  }
}

function wireEvents() {
  window.addEventListener('pointerdown', unlockAudioOnGesture, { once: true });
  window.addEventListener('keydown', unlockAudioOnGesture, { once: true });

  document.getElementById('btn-mute').addEventListener('click', () => {
    const nextMuted = !getSave().settings.muted;
    setMuted(nextMuted);
    updateTopBar();
  });

  document.getElementById('btn-controls').addEventListener('click', () => {
    playButtonClick();
    showControlsModal();
  });

  document.getElementById('btn-start-prix').addEventListener('click', () => {
    playButtonClick();
    homeScene.stop();
    renderDifficultyCards((diff) => {
      playButtonClick();
      const prix = createNewPrix(diff);
      startGrandPrixRound(prix);
    });
    showScreen('screen-difficulty');
  });

  document.getElementById('btn-resume-prix').addEventListener('click', () => {
    const save = getSave();
    if (!save.activePrix) return;
    playButtonClick();
    startGrandPrixRound(save.activePrix);
  });

  document.getElementById('btn-achievements').addEventListener('click', () => {
    playButtonClick();
    homeScene.stop();
    renderAchievements();
    showScreen('screen-achievements');
  });

  document.getElementById('btn-minigames').addEventListener('click', () => {
    playButtonClick();
    homeScene.stop();
    showScreen('screen-minigames');
  });

  document.getElementById('btn-diff-back').addEventListener('click', () => {
    playButtonClick();
    goHome();
  });
  document.getElementById('btn-ach-back').addEventListener('click', () => {
    playButtonClick();
    goHome();
  });
  document.getElementById('btn-mg-back').addEventListener('click', () => {
    playButtonClick();
    goHome();
  });

  document.getElementById('btn-combat-menu').addEventListener('click', () => {
    if (!activeCombat) return;
    playButtonClick();
    activeCombat.setPaused(true);
    showModal({
      title: 'Match Paused',
      bodyHtml: `<p>Your Grand Prix progress is automatically saved after every round.</p>`,
      actions: [
        {
          label: 'Resume Fight',
          variant: 'arcade-btn--primary',
          onClick: () => {
            playButtonClick();
            hideModal();
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
            activeCombat?.setPaused(false);
          }
        },
        {
          label: 'Save & Exit to Home',
          variant: 'arcade-btn--cyan',
          onClick: () => {
            playButtonClick();
            goHome();
          }
        }
      ]
    });
  });

  document.querySelectorAll('.mg-play-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      playButtonClick();
      launchMiniGame(btn.dataset.mg);
    });
  });

  document.getElementById('btn-mg-exit').addEventListener('click', () => {
    playButtonClick();
    cleanupActiveGameplay();
    hideModal();
    showScreen('screen-minigames');
  });
}

wireEvents();
updateTopBar();
showScreen('screen-home');
homeScene.start();
