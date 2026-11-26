import {
  playBell,
  playDodge,
  playGrab,
  playHurt,
  playKick,
  playPunch,
  playThrow,
  playVictory
} from '../audio.js';
import { AERIAL_BATTLE_WIN_COINS, PLAYER_BASE_HP } from '../constants.js';
import { DEMOLISHER_TEMPLATE, getRandomEnemy } from '../enemies.js';
import {
  drawFighter,
  drawFloatingTexts,
  drawParticles,
  resizeCanvas
} from '../renderer.js';

/**
 * Mini-Game 3: Aerial Battle
 * Free-fall mid-air combat against a randomized enemy with zero-footing physics
 * (unstable rotation, momentum drift, mid-air turning). Awards 150 Coins on win.
 */
export function startAerialBattle({
  canvas,
  onHudUpdate,
  onPunchLanded,
  onKickLanded,
  onGrabLanded,
  onComplete
}) {
  let rafId = null;
  let running = true;
  let ended = false;
  let time = 0;

  const { width: iw, height: ih } = resizeCanvas(canvas);
  const enemyTemplate = getRandomEnemy(1500, 150);

  const player = {
    ...DEMOLISHER_TEMPLATE,
    x: iw * 0.34,
    y: ih * 0.54,
    vx: 0,
    vy: 0,
    tiltAngle: 0,
    angVel: 0.4,
    facing: 1,
    hp: PLAYER_BASE_HP,
    maxHp: PLAYER_BASE_HP,
    state: 'idle',
    stateTimer: 0,
    hurtFlash: 0,
    invulnTimer: 0,
    attackHitDelivered: false,
    grabbingEnemy: false,
    grabTimer: 0,
    isFlying: true,
    noShadow: true
  };

  const enemy = {
    ...enemyTemplate,
    x: iw * 0.68,
    y: ih * 0.54,
    vx: 0,
    vy: 0,
    tiltAngle: -0.15,
    angVel: -0.5,
    facing: -1,
    hp: enemyTemplate.maxHp,
    maxHp: enemyTemplate.maxHp,
    state: 'idle',
    stateTimer: 0,
    hurtFlash: 0,
    aiCooldown: 0.9,
    noShadow: true
  };

  const keys = new Set();
  const particles = [];
  const floatingTexts = [];
  const clouds = Array.from({ length: 14 }, (_, i) => ({
    x: (i * 173) % 1200,
    y: (i * 97) % 700,
    size: 55 + (i % 4) * 28,
    speed: 190 + (i % 3) * 85
  }));

  function addText(x, y, text, color = '#ffd43b', size = 20) {
    floatingTexts.push({ x, y, vy: -45, text, color, size, life: 0.85, maxLife: 0.85 });
  }

  function spawnSparks(x, y, color) {
    for (let i = 0; i < 12; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 190;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 3 + Math.random() * 4,
        color,
        life: 0.45,
        maxLife: 0.45
      });
    }
  }

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (ended) return;
    const isRepeat = keys.has(e.code);
    keys.add(e.code);

    if (e.code === 'KeyD' || e.code === 'KeyS') {
      player.state = 'sidestep';
      player.stateTimer = 0.28;
      player.invulnTimer = 0.26;
      player.angVel += (Math.random() > 0.5 ? 1 : -1) * 4.2;
      playDodge();
    } else if (e.code === 'KeyK' && !isRepeat) {
      player.state = 'kick';
      player.stateTimer = 0.3;
      player.attackHitDelivered = false;
      playKick();
    } else if (e.code === 'KeyG' && !isRepeat && !player.grabbingEnemy) {
      player.state = 'grab';
      player.stateTimer = 0.26;
      player.attackHitDelivered = false;
      playGrab();
    } else if (e.code === 'KeyP' && !isRepeat && player.grabbingEnemy) {
      player.grabbingEnemy = false;
      player.state = 'throw';
      player.stateTimer = 0.36;
      playThrow();
      damageEnemy(260, 'AIR SLAM!', '#ffd43b', 220);
      enemy.angVel = 7.5;
    } else if (e.code === 'KeyT') {
      // Mid-air manual rotation / spin
      player.angVel += 3.2;
    }
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onMouseDown(e) {
    if (ended) return;
    if (e.button === 0) {
      player.state = 'leftPunch';
      player.stateTimer = 0.22;
      player.attackHitDelivered = false;
      playPunch(false);
    } else if (e.button === 2) {
      e.preventDefault();
      player.state = 'rightPunch';
      player.stateTimer = 0.28;
      player.attackHitDelivered = false;
      playPunch(true);
    }
  }

  function onContextMenu(e) {
    e.preventDefault();
  }

  function damageEnemy(dmg, word, color, impulse = 150) {
    if (ended) return;
    enemy.hp = Math.max(0, enemy.hp - dmg);
    enemy.hurtFlash = 0.16;
    enemy.vx += player.facing * impulse;
    enemy.vy -= 40;
    enemy.angVel += player.facing * 4.5;
    spawnSparks(enemy.x, enemy.y - 40, color);
    addText(enemy.x, enemy.y - 78, `${word} -${dmg}`, color, 20);
    if (enemy.hp <= 0) {
      ended = true;
      enemy.state = 'ko';
      playVictory();
      window.setTimeout(() => {
        if (running) onComplete?.({ won: true, coinsEarned: AERIAL_BATTLE_WIN_COINS, enemyName: enemy.name });
      }, 850);
    }
  }

  function damagePlayer(dmg) {
    if (ended || player.invulnTimer > 0) return;
    player.hp = Math.max(0, player.hp - dmg);
    player.hurtFlash = 0.18;
    player.vx -= player.facing * 140;
    player.angVel -= player.facing * 4.2;
    player.grabbingEnemy = false;
    playHurt();
    spawnSparks(player.x, player.y - 40, '#ef4444');
    addText(player.x, player.y - 78, `HIT! -${dmg}`, '#f43f5e', 20);
    if (player.hp <= 0) {
      ended = true;
      player.state = 'ko';
      playBell();
      window.setTimeout(() => {
        if (running) onComplete?.({ won: false, coinsEarned: 0, enemyName: enemy.name });
      }, 850);
    }
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

    if (!ended) {
      // Zero-footing physics: thrust + drift + unstable orientation
      let ax = 0;
      let ay = 0;
      if (keys.has('ArrowLeft')) ax -= 1;
      if (keys.has('ArrowRight')) ax += 1;
      if (keys.has('ArrowUp')) ay -= 1;
      if (keys.has('ArrowDown')) ay += 1;

      player.vx += ax * 760 * dt;
      player.vy += ay * 760 * dt;
      // Subtle wind turbulence
      player.vx += Math.sin(time * 2.1) * 35 * dt;
      player.vy += Math.cos(time * 1.7) * 35 * dt;

      // Low air drag
      player.vx *= 1 - 1.9 * dt;
      player.vy *= 1 - 1.9 * dt;
      player.x += player.vx * dt;
      player.y += player.vy * dt;

      // Unstable tilt + rotation torque from movement & turbulence
      player.angVel += (ax * 2.2 + Math.sin(time * 3.1) * 1.4 - player.tiltAngle * 2.1) * dt;
      player.angVel *= 1 - 1.6 * dt;
      player.tiltAngle += player.angVel * dt;

      player.facing = enemy.x >= player.x ? 1 : -1;
      player.hurtFlash = Math.max(0, player.hurtFlash - dt);
      player.invulnTimer = Math.max(0, player.invulnTimer - dt);

      // Keep within sky arena bounds
      player.x = Math.max(60, Math.min(w - 60, player.x));
      player.y = Math.max(110, Math.min(h - 60, player.y));

      if (player.stateTimer > 0) {
        player.stateTimer -= dt;
        if (!player.attackHitDelivered && ['leftPunch', 'rightPunch', 'kick', 'grab'].includes(player.state)) {
          const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
          if (dist < 105) {
            player.attackHitDelivered = true;
            if (player.state === 'grab') {
              player.grabbingEnemy = true;
              player.grabTimer = 1.8;
              addText(enemy.x, enemy.y - 84, 'AIR GRAB! [P] THROW!', '#38bdf8', 16);
              onGrabLanded?.();
            } else if (player.state === 'kick') {
              damageEnemy(190, 'AIR KICK!', '#fb923c', 180);
              onKickLanded?.();
            } else {
              const heavy = player.state === 'rightPunch';
              damageEnemy(heavy ? 175 : 125, heavy ? 'BAM!' : 'POW!', '#ffd43b', heavy ? 175 : 120);
              onPunchLanded?.();
            }
          }
        }
        if (player.stateTimer <= 0) player.state = 'idle';
      }

      if (player.grabbingEnemy) {
        player.grabTimer -= dt;
        enemy.x = player.x + player.facing * 52;
        enemy.y = player.y;
        if (player.grabTimer <= 0) player.grabbingEnemy = false;
      } else {
        // Enemy zero-footing AI
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.hypot(dx, dy) || 1;
        enemy.vx += (dx / dist) * 420 * dt;
        enemy.vy += (dy / dist) * 420 * dt;
        enemy.vx *= 1 - 1.8 * dt;
        enemy.vy *= 1 - 1.8 * dt;
        enemy.x = Math.max(60, Math.min(w - 60, enemy.x + enemy.vx * dt));
        enemy.y = Math.max(110, Math.min(h - 60, enemy.y + enemy.vy * dt));
        enemy.angVel += (Math.cos(time * 2.7) * 1.6 - enemy.tiltAngle * 2.0) * dt;
        enemy.angVel *= 1 - 1.6 * dt;
        enemy.tiltAngle += enemy.angVel * dt;
        enemy.facing = player.x >= enemy.x ? 1 : -1;
        enemy.hurtFlash = Math.max(0, enemy.hurtFlash - dt);

        enemy.aiCooldown -= dt;
        if (enemy.aiCooldown <= 0 && dist < 105) {
          enemy.aiCooldown = 1.25;
          enemy.state = 'rightPunch';
          enemy.stateTimer = 0.25;
          damagePlayer(enemy.damage);
        }
        if (enemy.stateTimer > 0) {
          enemy.stateTimer -= dt;
          if (enemy.stateTimer <= 0) enemy.state = 'idle';
        }
      }
    }

    // Sky free-fall gradient + rushing clouds & wind streaks
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0284c7');
    sky.addColorStop(0.55, '#38bdf8');
    sky.addColorStop(1, '#bae6fd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Rushing clouds upward (camera plummeting downward)
    for (const c of clouds) {
      c.y -= c.speed * dt;
      if (c.y < -120) {
        c.y = h + 120;
        c.x = Math.random() * w;
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
      ctx.arc(c.x + c.size * 0.65, c.y + 10, c.size * 0.72, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wind streaks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    for (let s = 0; s < 16; s += 1) {
      const sx = ((s * 97) % w);
      const sy = ((h - ((time * 540 + s * 83) % (h + 140))) + 70);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + 52);
      ctx.stroke();
    }

    drawFighter(ctx, player, time);
    drawFighter(ctx, enemy, time);
    drawParticles(ctx, particles);
    drawFloatingTexts(ctx, floatingTexts);

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

    onHudUpdate?.({
      primaryLabel: 'DEMOLISHER HP',
      primaryValue: `${Math.max(0, Math.ceil(player.hp))}`,
      secondaryLabel: `${enemy.name.toUpperCase()} HP`,
      secondaryValue: `${Math.max(0, Math.ceil(enemy.hp))}`,
      tertiaryLabel: 'WIN REWARD',
      tertiaryValue: `${AERIAL_BATTLE_WIN_COINS} COINS`,
      controlsHint: 'Arrows: Thrusters • L/R Click: Punch • K: Kick • G/P: Grab/Throw • T: Spin • D/S: Roll'
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
