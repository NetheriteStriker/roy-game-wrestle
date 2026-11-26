import {
  ABILITIES,
  ACHIEVEMENTS,
  CONTROLS_REFERENCE,
  DIFFICULTIES,
  DIFFICULTY_MAP,
  LEVEL_PASS_COINS
} from './constants.js';
import { getAchievementProgress, getSave } from './storage.js';

export function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.toggle('active', el.id === screenId);
  });
}

export function updateTopBar() {
  const save = getSave();
  document.getElementById('coin-value').textContent = save.totalCoins.toLocaleString();
  document.getElementById('btn-mute').textContent = save.settings.muted ? 'Sound: OFF' : 'Sound: ON';

  const resumeBtn = document.getElementById('btn-resume-prix');
  const resumeSub = document.getElementById('resume-prix-sub');
  if (save.activePrix) {
    const diff = DIFFICULTY_MAP[save.activePrix.difficultyId];
    resumeBtn.disabled = false;
    resumeSub.textContent = `${diff ? diff.name : ''} • Lvl ${save.activePrix.level} Rd ${save.activePrix.round}`;
  } else {
    resumeBtn.disabled = true;
    resumeSub.textContent = 'No Active Save';
  }

  const unlockedCount = Object.keys(save.unlockedAchievements).length;
  document.getElementById('home-ach-sub').textContent = `${unlockedCount} / ${ACHIEVEMENTS.length} Unlocked`;
}

export function renderDifficultyCards(onSelect) {
  const grid = document.getElementById('difficulty-grid');
  grid.innerHTML = '';
  for (const diff of DIFFICULTIES) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'diff-card';
    card.style.setProperty('--tier-color', diff.color);
    card.innerHTML = `
      <div class="diff-card-head">
        <span class="diff-name">${diff.name}</span>
        <span class="diff-tag">${diff.tagline}</span>
      </div>
      <div class="diff-stats">
        <div class="diff-stat-box">
          <span>Enemy Base HP</span>
          <strong>${diff.enemyHp.toLocaleString()}</strong>
        </div>
        <div class="diff-stat-box">
          <span>Damage per Hit</span>
          <strong>${diff.enemyDamage.toLocaleString()}</strong>
        </div>
      </div>
    `;
    card.addEventListener('click', () => onSelect(diff));
    grid.appendChild(card);
  }
}

export function renderAchievements() {
  const save = getSave();
  const grid = document.getElementById('achievements-grid');
  const unlockedCount = Object.keys(save.unlockedAchievements).length;
  document.getElementById('ach-summary-text').textContent =
    `${unlockedCount} of ${ACHIEVEMENTS.length} Milestones Completed`;

  grid.innerHTML = '';
  for (const ach of ACHIEVEMENTS) {
    const prog = getAchievementProgress(ach);
    const pct = Math.min(100, Math.round((prog.current / prog.target) * 100));
    const card = document.createElement('div');
    card.className = `ach-card ${prog.unlocked ? 'ach-card--unlocked' : ''}`;
    card.innerHTML = `
      <div class="ach-icon">${ach.icon}</div>
      <div class="ach-body">
        <div class="ach-title-row">
          <span class="ach-title">${ach.title}</span>
          <span class="ach-cat">${ach.category}</span>
        </div>
        <p class="ach-desc">${ach.description}</p>
        <div class="ach-progress-track">
          <div class="ach-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="ach-progress-label">
          ${prog.unlocked ? 'UNLOCKED ✓' : `${prog.current.toLocaleString()} / ${prog.target.toLocaleString()}`}
        </div>
      </div>
    `;
    grid.appendChild(card);
  }
}

export function updateCombatHud(prix, hudState) {
  const diff = DIFFICULTY_MAP[prix.difficultyId];
  document.getElementById('hud-match-badge').textContent = `LVL ${prix.level} • RD ${prix.round}/10`;
  document.getElementById('hud-diff-badge').textContent = diff ? diff.name.toUpperCase() : '';
  document.getElementById('hud-level-coins').textContent = `${prix.levelCoins} / ${LEVEL_PASS_COINS}`;
  document.getElementById('hud-attack-bonus').textContent = `+${prix.attackBonus} ATK Bonus`;

  document.getElementById('hud-player-hp-text').textContent =
    `${hudState.playerHp.toLocaleString()} / ${hudState.playerMaxHp.toLocaleString()}`;
  document.getElementById('hud-player-hp-fill').style.width =
    `${Math.max(0, (hudState.playerHp / hudState.playerMaxHp) * 100)}%`;

  document.getElementById('hud-enemy-name').textContent = hudState.enemyName.toUpperCase();
  document.getElementById('hud-enemy-title').textContent = hudState.enemyTitle;
  document.getElementById('hud-enemy-hp-text').textContent =
    `${hudState.enemyHp.toLocaleString()} / ${hudState.enemyMaxHp.toLocaleString()}`;
  document.getElementById('hud-enemy-hp-fill').style.width =
    `${Math.max(0, (hudState.enemyHp / hudState.enemyMaxHp) * 100)}%`;

  const spinBadge = document.getElementById('hud-spin-badge');
  if (hudState.continuousSpinTime > 0.2) {
    spinBadge.classList.remove('meta-chip--hidden');
    spinBadge.textContent = `Spin: ${hudState.continuousSpinTime.toFixed(1)}s / 10s`;
  } else {
    spinBadge.classList.add('meta-chip--hidden');
  }

  const bar = document.getElementById('hud-abilities-bar');
  bar.innerHTML = '';
  for (const ab of ABILITIES) {
    const unlocked = Boolean(prix.unlockedAbilities[ab.id]);
    let statusText = `Locked (Lvl ${ab.unlockLevel})`;
    let extraClass = 'ability-slot--locked';

    if (unlocked) {
      extraClass = 'ability-slot--unlocked';
      statusText = ab.id === 'gauntlet' ? 'EQUIPPED' : 'READY';
      if (ab.id === 'brickThrow' && hudState.brickCooldown > 0) {
        statusText = `${hudState.brickCooldown.toFixed(1)}s`;
      } else if (ab.id === 'flight' && hudState.isFlying) {
        extraClass = 'ability-slot--active';
        statusText = 'FLYING';
      } else if (ab.id === 'bulletPunch') {
        if (hudState.bulletBuffTimer > 0) {
          extraClass = 'ability-slot--active';
          statusText = `FLURRY ${hudState.bulletBuffTimer.toFixed(1)}s`;
        } else if (hudState.bulletCooldown > 0) {
          statusText = `${hudState.bulletCooldown.toFixed(1)}s`;
        }
      }
    }

    const slot = document.createElement('div');
    slot.className = `ability-slot ${extraClass}`;
    slot.innerHTML = `
      <div>
        <strong>${ab.name}</strong>
        <div style="font-size:11px;color:#cbd5e1">${statusText}</div>
      </div>
      <span class="ability-key">${ab.keyLabel}</span>
    `;
    bar.appendChild(slot);
  }
}

export function updateMiniGameHud(state) {
  document.getElementById('mg-hud-label-1').textContent = state.primaryLabel;
  document.getElementById('mg-hud-val-1').textContent = state.primaryValue;
  document.getElementById('mg-hud-label-2').textContent = state.secondaryLabel;
  document.getElementById('mg-hud-val-2').textContent = state.secondaryValue;
  document.getElementById('mg-hud-label-3').textContent = state.tertiaryLabel;
  document.getElementById('mg-hud-val-3').textContent = state.tertiaryValue;
  document.getElementById('mg-controls-hint').textContent = state.controlsHint;
}

export function showModal({ title, bodyHtml, warningText = '', actions = [] }) {
  const overlay = document.getElementById('modal-overlay');
  const card = document.getElementById('modal-card');
  card.innerHTML = `
    <h3>${title}</h3>
    <div>${bodyHtml}</div>
    ${warningText ? `<div class="modal-warning">${warningText}</div>` : ''}
    <div class="modal-actions"></div>
  `;
  const actionsWrap = card.querySelector('.modal-actions');
  for (const act of actions) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `arcade-btn ${act.variant || 'arcade-btn--primary'}`;
    btn.innerHTML = `<span class="btn-title">${act.label}</span>${act.sub ? `<span class="btn-sub">${act.sub}</span>` : ''}`;
    btn.addEventListener('click', () => {
      act.onClick?.();
    });
    actionsWrap.appendChild(btn);
  }
  overlay.classList.remove('hidden');
}

export function hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

export function showControlsModal() {
  const rows = CONTROLS_REFERENCE.map(
    (c) => `<div class="control-row"><span>${c.action}</span><kbd>${c.key}</kbd></div>`
  ).join('');
  showModal({
    title: 'Controls & Special Abilities',
    bodyHtml: `<div class="controls-table">${rows}</div>`,
    actions: [
      {
        label: 'Close',
        variant: 'arcade-btn--cyan',
        onClick: hideModal
      }
    ]
  });
}

export function showAchievementToast(ach) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-icon">${ach.icon}</span>
    <div>
      <div class="toast-title">ACHIEVEMENT UNLOCKED!</div>
      <div class="toast-sub">${ach.title} — ${ach.description}</div>
    </div>
  `;
  container.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 4200);
}
