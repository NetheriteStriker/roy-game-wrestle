import { DEMOLISHER_TEMPLATE, ENEMY_ROSTER } from './enemies.js';
import {
  drawArenaBackground,
  drawFighter,
  drawParticles,
  getRingMetrics,
  resizeCanvas
} from './renderer.js';

/**
 * Animated Home Screen Canvas:
 * Renders the wrestling ring with Demolisher and a showcase rival facing off,
 * surrounded by an animated cheering audience positioned above the main menu buttons.
 */
export function createHomeScene(canvas) {
  let rafId = null;
  let running = false;
  let startTime = performance.now();
  let rivalIndex = 0;
  let lastSwap = 0;
  let particles = [];

  function spawnSpark(x, y) {
    for (let i = 0; i < 10; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 140;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 40,
        size: 3 + Math.random() * 3,
        color: i % 2 === 0 ? '#ffd43b' : '#fb923c',
        life: 0.45,
        maxLife: 0.45
      });
    }
  }

  let prevTs = performance.now();
  let lastClashCycle = -1;

  function frame(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - prevTs) / 1000);
    prevTs = ts;
    const time = (ts - startTime) / 1000;

    const { width: w, height: h } = resizeCanvas(canvas);
    const ctx = canvas.getContext('2d');
    const ring = getRingMetrics(w, h);

    if (time - lastSwap > 7.5) {
      lastSwap = time;
      rivalIndex = (rivalIndex + 1) % ENEMY_ROSTER.length;
    }

    const rivalTemplate = ENEMY_ROSTER[rivalIndex];

    // Choreographed ring face-off & feint strikes
    const cycle = time % 3.2;
    const cycleNum = Math.floor(time / 3.2);
    const pStrike = cycle > 1.2 && cycle < 1.55;
    const eStrike = cycle > 2.35 && cycle < 2.7;

    if ((pStrike || eStrike) && cycleNum !== lastClashCycle) {
      lastClashCycle = cycleNum;
      spawnSpark(ring.centerX, ring.centerY - 46);
    }

    const excitement = pStrike || eStrike ? 0.85 : 0.35;
    const arena = drawArenaBackground(ctx, w, h, time, excitement, {
      bannerText: `TONIGHT: DEMOLISHER VS ${rivalTemplate.name.toUpperCase()}`,
      ropeBounce: pStrike || eStrike ? 6 : 2
    });

    // Update sparks
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const pt = particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 260 * dt;
      pt.life -= dt;
      if (pt.life <= 0) particles.splice(i, 1);
    }

    const lungeP = pStrike ? Math.sin(((cycle - 1.2) / 0.35) * Math.PI) * 58 : 0;
    const lungeE = eStrike ? Math.sin(((cycle - 2.35) / 0.35) * Math.PI) * 58 : 0;
    const sway = Math.sin(time * 2.4) * 14;

    const demolisher = {
      ...DEMOLISHER_TEMPLATE,
      x: ring.centerX - 108 + sway + lungeP,
      y: ring.centerY + 14,
      facing: 1,
      scale: 1.08,
      state: pStrike ? 'rightPunch' : Math.abs(Math.cos(time * 2.4)) > 0.65 ? 'walk' : 'idle',
      hasGauntlet: false
    };

    const rival = {
      ...rivalTemplate,
      x: ring.centerX + 108 - sway - lungeE,
      y: ring.centerY + 14,
      facing: -1,
      scale: rivalTemplate.scale * 1.08,
      state: eStrike ? 'leftPunch' : pStrike ? 'duck' : 'idle'
    };

    drawFighter(ctx, demolisher, time);
    drawFighter(ctx, rival, time);
    drawParticles(ctx, particles);
    arena.drawForegroundRopes();

    // VS crest in the upper ring center above the ropes
    ctx.save();
    ctx.fillStyle = '#ffd43b';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;
    ctx.font = '900 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText('VS', ring.centerX, ring.matTop - 96);
    ctx.fillText('VS', ring.centerX, ring.matTop - 96);
    ctx.restore();

    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      prevTs = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }
  };
}
