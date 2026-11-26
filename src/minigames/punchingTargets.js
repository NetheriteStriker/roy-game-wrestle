import { playBell, playCoin, playJump, playPunch } from '../audio.js';
import { PUNCHING_TARGET_COINS } from '../constants.js';
import { DEMOLISHER_TEMPLATE } from '../enemies.js';
import {
  drawArenaBackground,
  drawFighter,
  drawFloatingTexts,
  drawParticles,
  getRingMetrics,
  resizeCanvas
} from '../renderer.js';

/**
 * Mini-Game 1: Punching Targets
 * Targets spawn and fly across the screen; punch as many as possible before the timer expires.
 * Each target hit awards 50 Coins.
 */
export function startPunchingTargets({ canvas, onHudUpdate, onPunchLanded, onComplete }) {
  let rafId = null;
  let running = true;
  let ended = false;
  let time = 0;
  let timeLeft = 45;
  let scoreHits = 0;
  let coinsEarned = 0;
  let spawnTimer = 0.2;

  const { width: iw, height: ih } = resizeCanvas(canvas);
  const initRing = getRingMetrics(iw, ih);

  const player = {
    ...DEMOLISHER_TEMPLATE,
    x: initRing.centerX,
    y: initRing.centerY + 24,
    z: 0,
    vz: 0,
    jumpsRemaining: 2,
    facing: 1,
    state: 'idle',
    stateTimer: 0
  };

  const keys = new Set();
  const targets = [];
  const particles = [];
  const floatingTexts = [];

  function spawnTarget(w, h) {
    const fromLeft = Math.random() < 0.5;
    const kindRoll = Math.random();
    const kind = kindRoll < 0.45 ? 'cruiser' : kindRoll < 0.8 ? 'arc' : 'speedy';
    const radius = kind === 'speedy' ? 22 : 27;
    const y = h * (0.24 + Math.random() * 0.40);
    const speed = kind === 'speedy' ? 290 + Math.random() * 90 : 175 + Math.random() * 85;
    targets.push({
      x: fromLeft ? -35 : w + 35,
      y,
      baseY: y,
      vx: fromLeft ? speed : -speed,
      vy: kind === 'arc' ? -150 : 0,
      kind,
      radius,
      phase: Math.random() * Math.PI * 2,
      color: kind === 'speedy' ? '#ffd43b' : kind === 'arc' ? '#38bdf8' : '#f43f5e'
    });
  }

  function spawnJumpDust(x, y) {
    for (let i = 0; i < 6; i += 1) {
      const a = Math.PI + (Math.random() - 0.5) * 1.6;
      const spd = 40 + Math.random() * 80;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * 30 - 20,
        size: 3 + Math.random() * 2,
        color: '#e2e8f0',
        life: 0.28,
        maxLife: 0.28
      });
    }
  }

  function punchAt(heavy) {
    if (ended) return;
    player.state = heavy ? 'rightPunch' : 'leftPunch';
    player.stateTimer = 0.18;
    playPunch(heavy);

    const punchX = player.x + player.facing * 52;
    const punchY = player.y - player.z - 52;

    for (let i = targets.length - 1; i >= 0; i -= 1) {
      const t = targets[i];
      const dist = Math.hypot(t.x - punchX, t.y - punchY);
      if (dist <= t.radius + 46) {
        targets.splice(i, 1);
        scoreHits += 1;
        coinsEarned += PUNCHING_TARGET_COINS;
        playCoin();
        onPunchLanded?.();
        for (let p = 0; p < 14; p += 1) {
          const a = Math.random() * Math.PI * 2;
          const spd = 90 + Math.random() * 190;
          particles.push({
            x: t.x,
            y: t.y,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd - 40,
            size: 4 + Math.random() * 3,
            color: p % 2 === 0 ? t.color : '#ffd43b',
            life: 0.45,
            maxLife: 0.45
          });
        }
        floatingTexts.push({
          x: t.x,
          y: t.y - 16,
          vy: -60,
          text: `+${PUNCHING_TARGET_COINS} COINS!`,
          color: '#ffd43b',
          size: 19,
          life: 0.85,
          maxLife: 0.85
        });
      }
    }
  }

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    const isRepeat = keys.has(e.code);
    keys.add(e.code);

    if (!ended && !isRepeat && (e.code === 'Space' || e.code === 'ArrowUp') && player.jumpsRemaining > 0) {
      const isFirstJump = player.z <= 1;
      player.vz = isFirstJump ? 690 : 620;
      player.z = Math.max(player.z, 1);
      player.jumpsRemaining -= 1;
      playJump();
      spawnJumpDust(player.x, player.y - player.z);
    }
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }
  function onMouseDown(e) {
    if (ended) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    player.facing = clickX >= player.x ? 1 : -1;
    if (e.button === 0) punchAt(false);
    if (e.button === 2) {
      e.preventDefault();
      punchAt(true);
    }
  }
  function onContextMenu(e) {
    e.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('contextmenu', onContextMenu);

  playBell();
  let prevTs = performance.now();

  function frame(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - prevTs) / 1000);
    prevTs = ts;
    time += dt;

    const { width: w, height: h } = resizeCanvas(canvas);
    const ctx = canvas.getContext('2d');
    const ring = getRingMetrics(w, h);
    player.y = ring.centerY + 24;

    if (!ended) {
      timeLeft = Math.max(0, timeLeft - dt);
      if (timeLeft <= 0) {
        ended = true;
        playBell();
        onComplete?.({ hits: scoreHits, coinsEarned });
      }

      // Horizontal movement + parabolic jump / double-jump physics
      let mx = 0;
      if (keys.has('ArrowLeft')) mx -= 1;
      if (keys.has('ArrowRight')) mx += 1;

      if (mx !== 0) {
        player.x += mx * 340 * dt;
        player.facing = mx > 0 ? 1 : -1;
        if (player.state === 'idle') player.state = 'walk';
      } else if (player.state === 'walk') {
        player.state = 'idle';
      }

      if (keys.has('ArrowDown') && player.z > 0) {
        player.vz = Math.min(player.vz, -460);
      }

      const maxCeiling = Math.max(260, h * 0.56);
      if (player.z > 0 || player.vz > 0) {
        player.vz -= 1500 * dt;
        player.z += player.vz * dt;
        if (player.z > maxCeiling) {
          player.z = maxCeiling;
          player.vz = Math.min(0, player.vz);
        }
        if (player.z <= 0) {
          player.z = 0;
          player.vz = 0;
          player.jumpsRemaining = 2;
        }
      }
      player.x = Math.max(ring.playMinX, Math.min(ring.playMaxX, player.x));

      if (player.stateTimer > 0) {
        player.stateTimer -= dt;
        if (player.stateTimer <= 0) player.state = 'idle';
      }

      // Spawn flying targets
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTarget(w, h);
        spawnTimer = Math.max(0.42, 0.85 - (45 - timeLeft) * 0.008);
      }

      for (let i = targets.length - 1; i >= 0; i -= 1) {
        const t = targets[i];
        t.x += t.vx * dt;
        if (t.kind === 'arc') {
          t.vy += 260 * dt;
          t.y += t.vy * dt;
        } else if (t.kind === 'speedy') {
          t.y = t.baseY + Math.sin(time * 7 + t.phase) * 44;
        }
        if (t.x < -60 || t.x > w + 60 || t.y > h + 60) {
          targets.splice(i, 1);
        }
      }
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const pt = particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) particles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
      const ft = floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    const arena = drawArenaBackground(ctx, w, h, time, 0.4, {
      bannerText: 'MINI GAME: PUNCHING TARGETS (+50 COINS / HIT)'
    });

    drawFighter(ctx, { ...player, isFlying: false }, time);
    arena.drawForegroundRopes();

    // Draw flying bullseye targets
    for (const t of targets) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, t.radius * 0.62, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(0, 0, t.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawParticles(ctx, particles);
    drawFloatingTexts(ctx, floatingTexts);

    onHudUpdate?.({
      primaryLabel: 'TIME LEFT',
      primaryValue: `${Math.ceil(timeLeft)}s`,
      secondaryLabel: 'TARGETS HIT',
      secondaryValue: `${scoreHits}`,
      tertiaryLabel: 'COINS WON',
      tertiaryValue: `${coinsEarned}`,
      controlsHint: 'Arrow Left/Right: Move • Space / Up: Jump (Double Jump!) • Down: Fast Fall • L / R Click: Punch'
    });

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  return {
    destroy() {
      running = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('contextmenu', onContextMenu);
    }
  };
}
