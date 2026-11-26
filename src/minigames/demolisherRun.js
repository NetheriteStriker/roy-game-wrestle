import { playBell, playDefeat, playSlice, playVictory } from '../audio.js';
import { DEMOLISHER_RUN_WIN_COINS } from '../constants.js';
import { DEMOLISHER_TEMPLATE, ENEMY_ROSTER } from '../enemies.js';
import { drawFighter, drawFloatingTexts, resizeCanvas, roundRect } from '../renderer.js';

/**
 * Mini-Game 2: Demolisher Run
 * Linear obstacle corridor with pursuit pressure from behind, vertical swinging knives,
 * and horizontal moving cutters. Arrow Keys control Demolisher toward the finish line.
 */
export function startDemolisherRun({ canvas, onHudUpdate, onComplete }) {
  let rafId = null;
  let running = true;
  let ended = false;
  let time = 0;

  const courseLength = 3200;
  const laneHalfWidth = 220;

  // Player tracks distance `s` (0 .. courseLength) and lateral `lx` (-laneHalfWidth .. laneHalfWidth)
  const player = {
    s: 160,
    lx: 0,
    speed: 0
  };

  // Pursuers start behind and accelerate slightly if Demolisher hesitates
  const pursuers = [
    { template: ENEMY_ROSTER[0], s: 10, lx: -72 },
    { template: ENEMY_ROSTER[4], s: 0, lx: 0 },
    { template: ENEMY_ROSTER[2], s: 14, lx: 72 }
  ];

  // Build deterministic gauntlet of Vertical Swinging Knives & Horizontal Moving Cutters
  const hazards = [];
  for (let s = 460; s < courseLength - 220; s += 260) {
    const index = Math.round((s - 460) / 260);
    if (index % 2 === 0) {
      // Vertical swinging knife (guillotine pendulum oscillating up and down)
      hazards.push({
        type: 'verticalKnife',
        s,
        phase: index * 1.15,
        speed: 2.8 + (index % 3) * 0.45,
        lxCenter: ((index % 3) - 1) * 55,
        width: 150
      });
    } else {
      // Horizontal moving cutter sliding laterally across the lane
      hazards.push({
        type: 'horizontalCutter',
        s,
        phase: index * 0.9,
        speed: 2.35 + (index % 3) * 0.4,
        radius: 36
      });
    }
  }

  const keys = new Set();
  const floatingTexts = [];

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    keys.add(e.code);
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  playBell();

  let prevTs = performance.now();

  function failRun(reason) {
    if (ended) return;
    ended = true;
    playDefeat();
    onComplete?.({ won: false, reason, coinsEarned: 0, progressPct: Math.round((player.s / courseLength) * 100) });
  }

  function winRun() {
    if (ended) return;
    ended = true;
    playVictory();
    onComplete?.({ won: true, coinsEarned: DEMOLISHER_RUN_WIN_COINS, timeTaken: time.toFixed(1) });
  }

  function frame(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - prevTs) / 1000);
    prevTs = ts;
    time += dt;

    const { width: w, height: h } = resizeCanvas(canvas);
    const ctx = canvas.getContext('2d');
    const centerX = w * 0.5;
    const playerScreenY = h * 0.68;

    if (!ended) {
      // Player Arrow Keys control
      let forward = 0;
      let lateral = 0;
      if (keys.has('ArrowUp')) forward += 1;
      if (keys.has('ArrowDown')) forward -= 0.45;
      if (keys.has('ArrowLeft')) lateral -= 1;
      if (keys.has('ArrowRight')) lateral += 1;

      const forwardSpeed = forward > 0 ? 275 : forward < 0 ? -110 : 0;
      player.s = Math.max(0, player.s + forwardSpeed * dt);
      player.lx = Math.max(
        -laneHalfWidth + 28,
        Math.min(laneHalfWidth - 28, player.lx + lateral * 265 * dt)
      );

      // Pursuers maintain steady pursuit speed (215 px/s, slightly faster if player stops)
      const pursuitSpeed = forward <= 0 ? 235 : 212;
      for (const p of pursuers) {
        p.s += pursuitSpeed * dt;
        // Gently track player laterally
        p.lx += (player.lx - p.lx) * 1.1 * dt;
        if (p.s >= player.s - 22) {
          failRun('Caught by the pursuing wrestlers! Keep moving forward!');
          break;
        }
      }

      // Check hazard collisions
      for (const hz of hazards) {
        const ds = Math.abs(hz.s - player.s);
        if (hz.type === 'verticalKnife') {
          // Height factor 0 (slammed down) .. 1 (high safe clearance)
          const cycle = (Math.sin(time * hz.speed + hz.phase) + 1) * 0.5;
          hz.clearance = cycle;
          if (ds < 20 && cycle < 0.36 && Math.abs(player.lx - hz.lxCenter) < hz.width * 0.48) {
            playSlice();
            failRun('Hit by a Vertical Swinging Knife! Time the upward swing.');
            break;
          }
        } else {
          const cutterX = Math.sin(time * hz.speed + hz.phase) * (laneHalfWidth - 44);
          hz.currentLx = cutterX;
          if (ds < 26 && Math.abs(player.lx - cutterX) < hz.radius + 16) {
            playSlice();
            failRun('Sliced by a Horizontal Moving Cutter! Weave into the open gap.');
            break;
          }
        }
      }

      if (!ended && player.s >= courseLength) {
        winRun();
      }
    }

    // Draw corridor background
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0a071a');
    bg.addColorStop(1, '#1a1238');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Track lane
    const laneLeft = centerX - laneHalfWidth;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(laneLeft, 0, laneHalfWidth * 2, h);

    // Scrolling track stripes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    const stripeOffset = player.s % 80;
    for (let sy = -80; sy < h + 80; sy += 80) {
      const yPos = sy + stripeOffset;
      ctx.beginPath();
      ctx.moveTo(laneLeft + 18, yPos);
      ctx.lineTo(laneLeft + laneHalfWidth * 2 - 18, yPos);
      ctx.stroke();
    }

    // Neon lane guard rails
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(laneLeft - 10, 0, 10, h);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(laneLeft + laneHalfWidth * 2, 0, 10, h);

    // Helper: map course distance s to screen Y
    const toScreenY = (sVal) => playerScreenY - (sVal - player.s);

    // Finish line checkered banner
    const finishY = toScreenY(courseLength);
    if (finishY > -60 && finishY < h + 60) {
      const sq = 22;
      for (let x = laneLeft; x < laneLeft + laneHalfWidth * 2; x += sq) {
        for (let r = 0; r < 2; r += 1) {
          const even = (Math.floor((x - laneLeft) / sq) + r) % 2 === 0;
          ctx.fillStyle = even ? '#ffffff' : '#0f172a';
          ctx.fillRect(x, finishY - 22 + r * sq, sq, sq);
        }
      }
      ctx.fillStyle = '#ffd43b';
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FINISH LINE', centerX, finishY - 34);
    }

    // Draw Hazards
    for (const hz of hazards) {
      const sy = toScreenY(hz.s);
      if (sy < -140 || sy > h + 140) continue;

      if (hz.type === 'verticalKnife') {
        const cycle = hz.clearance ?? (Math.sin(time * hz.speed + hz.phase) + 1) * 0.5;
        const hx = centerX + hz.lxCenter;
        const dropHeight = cycle * 74; // 0 = touching mat, 74 = raised high
        const safe = cycle >= 0.36;

        // Danger zone floor shadow
        ctx.fillStyle = safe ? 'rgba(34, 197, 94, 0.22)' : 'rgba(239, 68, 68, 0.38)';
        roundRect(ctx, hx - hz.width * 0.5, sy - 10, hz.width, 20, 6);
        ctx.fill();

        // Overhead rail & blade oscillating vertically
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(hx, sy - 108);
        ctx.lineTo(hx, sy - dropHeight - 24);
        ctx.stroke();

        ctx.fillStyle = safe ? '#cbd5e1' : '#f43f5e';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(hx - hz.width * 0.45, sy - dropHeight - 24);
        ctx.lineTo(hx + hz.width * 0.45, sy - dropHeight - 24);
        ctx.lineTo(hx + hz.width * 0.36, sy - dropHeight);
        ctx.lineTo(hx - hz.width * 0.36, sy - dropHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        const cx = centerX + (hz.currentLx ?? 0);
        // Track groove
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.35)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(laneLeft + 24, sy);
        ctx.lineTo(laneLeft + laneHalfWidth * 2 - 24, sy);
        ctx.stroke();

        // Spinning saw cutter
        ctx.save();
        ctx.translate(cx, sy - 16);
        ctx.rotate(time * 12);
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let t = 0; t < 12; t += 1) {
          const ang = (t * Math.PI * 2) / 12;
          const r = t % 2 === 0 ? hz.radius : hz.radius * 0.68;
          if (t === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
          else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Draw Demolisher + Pursuers sorted by Y
    const actors = [
      {
        ...DEMOLISHER_TEMPLATE,
        x: centerX + player.lx,
        y: playerScreenY,
        facing: 1,
        scale: 0.78,
        state: keys.has('ArrowUp') ? 'walk' : 'idle'
      },
      ...pursuers.map((p) => ({
        ...p.template,
        x: centerX + p.lx,
        y: toScreenY(p.s),
        facing: 1,
        scale: 0.78,
        state: 'walk'
      }))
    ].sort((a, b) => a.y - b.y);

    for (const actor of actors) {
      if (actor.y > -80 && actor.y < h + 110) {
        drawFighter(ctx, actor, time);
      }
    }

    // Pursuit danger vignette if pursuers are close
    const closestGap = Math.min(...pursuers.map((p) => player.s - p.s));
    if (closestGap < 125 && !ended) {
      const alpha = Math.min(0.45, (125 - closestGap) / 190);
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.fillRect(0, h - 26, w, 26);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PURSUERS CLOSING IN! HOLD UP ARROW!', centerX, h - 10);
    }

    drawFloatingTexts(ctx, floatingTexts);

    onHudUpdate?.({
      primaryLabel: 'DISTANCE',
      primaryValue: `${Math.min(100, Math.round((player.s / courseLength) * 100))}%`,
      secondaryLabel: 'PURSUIT GAP',
      secondaryValue: `${Math.max(0, Math.round(closestGap))}m`,
      tertiaryLabel: 'REWARD',
      tertiaryValue: `${DEMOLISHER_RUN_WIN_COINS} COINS`,
      controlsHint: 'Arrow Up: Sprint Forward • Arrow Left/Right: Weave Cutters • Time Vertical Knives'
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
    }
  };
}
