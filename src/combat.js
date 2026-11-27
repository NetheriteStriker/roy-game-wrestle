import {
  playBell,
  playBrick,
  playDodge,
  playFlightToggle,
  playGrab,
  playHurt,
  playJump,
  playKick,
  playPunch,
  playSpinTick,
  playThrow
} from './audio.js';
import { PLAYER_BASE_HP } from './constants.js';
import { DEMOLISHER_TEMPLATE } from './enemies.js';
import {
  drawArenaBackground,
  drawFighter,
  drawFloatingTexts,
  drawParticles,
  drawProjectiles,
  getRingMetrics,
  resizeCanvas
} from './renderer.js';

/**
 * Core 1v1 Grand Prix combat engine.
 * Implements all PRD controls, enemy first-attack initiative, ability unlocks,
 * spin tracking, and combat HUD synchronization.
 */
export function startCombatSession({
  canvas,
  enemyConfig,
  attackBonus,
  abilities,
  level,
  round,
  difficultyName,
  onHudUpdate,
  onVictory,
  onDefeat,
  onPunchLanded,
  onKickLanded,
  onKickUsed,
  onGrabLanded,
  onSpin10Seconds
}) {
  let rafId = null;
  let running = true;
  let paused = false;
  let ended = false;
  let time = 0;
  let introTimer = 1.05;
  let screenShake = 0;
  let crowdExcitement = 0.35;
  let ropeBounce = 0;

  const { width: initW, height: initH } = resizeCanvas(canvas);
  const initRing = getRingMetrics(initW, initH);

  const player = {
    ...DEMOLISHER_TEMPLATE,
    x: initRing.centerX - 140,
    y: initRing.centerY + 12,
    z: 0,
    vz: 0,
    facing: 1,
    hp: PLAYER_BASE_HP,
    maxHp: PLAYER_BASE_HP,
    state: 'idle',
    stateTimer: 0,
    attackHitDelivered: false,
    hurtFlash: 0,
    hasGauntlet: Boolean(abilities.gauntlet),
    isFlying: false,
    spinAngle: 0,
    continuousSpinTime: 0,
    spinGraceTimer: 0,
    spinSoundAccum: 0,
    spin10Unlocked: false,
    sidestepDir: 0,
    sidestepOffset: 0,
    invulnTimer: 0,
    brickCooldown: 0,
    bulletCooldown: 0,
    bulletBuffTimer: 0,
    grabbingEnemy: false,
    grabTimer: 0
  };

  const enemy = {
    ...enemyConfig,
    x: initRing.centerX + 140,
    y: initRing.centerY + 12,
    z: 0,
    facing: -1,
    hp: enemyConfig.maxHp,
    maxHp: enemyConfig.maxHp,
    state: 'idle',
    stateTimer: 0,
    hurtFlash: 0,
    invulnTimer: 0,
    telegraphType: null,
    telegraphTimer: 0,
    telegraphDuration: 0.72,
    attackQueued: false,
    aiCooldown: 0.05,
    mustInitiateFirstAttack: true,
    attackHitDelivered: false,
    rushDir: -1,
    sidestepOffset: 0
  };

  const keys = new Set();
  const projectiles = [];
  const particles = [];
  const floatingTexts = [];
  let brickSpinAngle = 0;

  function spawnParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 210;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 60,
        size: 3 + Math.random() * 4,
        color,
        life: 0.42 + Math.random() * 0.2,
        maxLife: 0.62
      });
    }
  }

  function addFloatingText(x, y, text, color = '#ffd43b', size = 20) {
    floatingTexts.push({
      x,
      y,
      vy: -56,
      text,
      color,
      size,
      life: 0.9,
      maxLife: 0.9
    });
  }

  function syncHud() {
    onHudUpdate?.({
      playerHp: Math.max(0, Math.ceil(player.hp)),
      playerMaxHp: player.maxHp,
      enemyHp: Math.max(0, Math.ceil(enemy.hp)),
      enemyMaxHp: enemy.maxHp,
      enemyName: enemy.name,
      enemyTitle: enemy.title,
      isFlying: player.isFlying,
      brickCooldown: player.brickCooldown,
      bulletCooldown: player.bulletCooldown,
      bulletBuffTimer: player.bulletBuffTimer,
      continuousSpinTime: player.continuousSpinTime,
      grabbing: player.grabbingEnemy,
      introTimer
    });
  }

  function calcDamage(kind) {
    const gauntlet = player.hasGauntlet;
    if (kind === 'leftPunch') return 95 + attackBonus + (gauntlet ? 100 : 0);
    if (kind === 'rightPunch') return 140 + attackBonus + (gauntlet ? 125 : 0);
    if (kind === 'bulletPunch') return 55 + Math.round(attackBonus * 0.5) + (gauntlet ? 45 : 0);
    if (kind === 'kick') return 165 + attackBonus;
    if (kind === 'throw') return 260 + attackBonus;
    if (kind === 'brick') return 240 + attackBonus;
    return 100 + attackBonus;
  }

  function canPlayerAct() {
    if (ended || paused || introTimer > 0) return false;
    return !['hurt', 'ko', 'throw', 'sidestep'].includes(player.state);
  }

  function triggerAttack(kind) {
    if (!canPlayerAct()) return;
    if (player.grabbingEnemy && kind !== 'throw') {
      // Allow throwing or breaking out cleanly
      return;
    }

    if (kind === 'leftPunch') {
      if (player.bulletBuffTimer > 0) {
        player.state = 'bulletPunch';
        player.stateTimer = 0.095;
        player.attackHitDelivered = false;
        playPunch(false);
        return;
      }
      if (player.state === 'leftPunch' || player.state === 'rightPunch' || player.state === 'kick') return;
      player.state = 'leftPunch';
      player.stateTimer = 0.22;
      player.attackHitDelivered = false;
      playPunch(false);
    } else if (kind === 'rightPunch') {
      if (player.state === 'leftPunch' || player.state === 'rightPunch' || player.state === 'kick') return;
      player.state = 'rightPunch';
      player.stateTimer = 0.3;
      player.attackHitDelivered = false;
      playPunch(true);
    } else if (kind === 'kick') {
      if (player.state === 'kick' || player.state === 'leftPunch' || player.state === 'rightPunch') return;
      player.state = 'kick';
      player.stateTimer = 0.34;
      player.attackHitDelivered = false;
      onKickUsed?.();
      playKick();
    } else if (kind === 'grab') {
      if (player.grabbingEnemy || player.state === 'grab') return;
      player.state = 'grab';
      player.stateTimer = 0.26;
      player.attackHitDelivered = false;
      playGrab();
    } else if (kind === 'throw') {
      if (!player.grabbingEnemy) {
        addFloatingText(player.x, player.y - 105, 'Grab [G] first!', '#94a3b8', 15);
        return;
      }
      player.grabbingEnemy = false;
      player.state = 'throw';
      player.stateTimer = 0.42;
      playThrow();
      const dmg = calcDamage('throw');
      damageEnemy(dmg, 'SLAM!', '#ffd43b', 160);
      enemy.z = 55;
      enemy.state = 'hurt';
      enemy.stateTimer = 0.55;
    } else if (kind === 'brick') {
      if (!abilities.brickThrow) return;
      if (player.brickCooldown > 0) {
        addFloatingText(player.x, player.y - 105, `Brick ${player.brickCooldown.toFixed(1)}s`, '#cbd5e1', 14);
        return;
      }
      player.state = 'brickThrow';
      player.stateTimer = 0.26;
      player.brickCooldown = 2.2;
      playBrick();
      projectiles.push({
        owner: 'player',
        kind: 'brick',
        x: player.x + player.facing * 32,
        y: player.y,
        z: player.z + 52,
        vx: player.facing * 560,
        vy: 0,
        angle: 0,
        damage: calcDamage('brick')
      });
    } else if (kind === 'flight') {
      if (!abilities.flight) return;
      player.isFlying = !player.isFlying;
      playFlightToggle(player.isFlying);
      if (player.isFlying) {
        player.z = Math.max(player.z, 76);
        addFloatingText(player.x, player.y - player.z - 80, 'FLIGHT ON!', '#38bdf8', 18);
      } else {
        addFloatingText(player.x, player.y - player.z - 80, 'LANDING', '#cbd5e1', 16);
      }
    } else if (kind === 'bulletMode') {
      if (!abilities.bulletPunch) return;
      if (player.bulletCooldown > 0 || player.bulletBuffTimer > 0) return;
      player.bulletBuffTimer = 3.5;
      player.bulletCooldown = 6.5;
      addFloatingText(player.x, player.y - player.z - 95, 'BULLET PUNCH! SPAM L-CLICK!', '#fb923c', 17);
      playBell();
    }
  }

  function damageEnemy(dmg, word, color = '#ffd43b', knockback = 42) {
    if (ended) return;
    enemy.hp = Math.max(0, enemy.hp - dmg);
    enemy.hurtFlash = 0.14;
    enemy.telegraphType = null;
    enemy.attackQueued = false;
    enemy.x += player.facing * knockback;
    screenShake = Math.min(12, screenShake + 5);
    crowdExcitement = Math.min(1, crowdExcitement + 0.25);
    ropeBounce = 8;
    spawnParticles(enemy.x, enemy.y - enemy.z - 46, color, 14);
    addFloatingText(enemy.x, enemy.y - enemy.z - 82, `${word} -${dmg}`, color, 20);
    if (enemy.hp <= 0) {
      finishBattle(true);
    }
  }

  function damagePlayer(dmg, label = 'HIT!') {
    if (ended || player.invulnTimer > 0) return;
    player.hp = Math.max(0, player.hp - dmg);
    player.hurtFlash = 0.18;
    player.grabbingEnemy = false;
    player.continuousSpinTime = 0;
    if (player.state === 'spin') player.state = 'idle';
    player.state = 'hurt';
    player.stateTimer = 0.24;
    player.x -= player.facing * 26;
    screenShake = Math.min(14, screenShake + 7);
    crowdExcitement = Math.min(1, crowdExcitement + 0.28);
    playHurt();
    spawnParticles(player.x, player.y - player.z - 46, '#ef4444', 14);
    addFloatingText(player.x, player.y - player.z - 84, `${label} -${dmg}`, '#f43f5e', 21);
    if (player.hp <= 0) {
      finishBattle(false);
    }
  }

  function finishBattle(playerWon) {
    if (ended) return;
    ended = true;
    if (playerWon) {
      enemy.state = 'ko';
      player.state = 'idle';
      crowdExcitement = 1;
      playBell();
      addFloatingText(enemy.x, enemy.y - 105, 'K.O.!', '#ffd43b', 34);
      window.setTimeout(() => {
        if (running) onVictory?.();
      }, 900);
    } else {
      player.state = 'ko';
      enemy.state = 'idle';
      crowdExcitement = 0.9;
      playBell();
      addFloatingText(player.x, player.y - 105, 'KNOCKED OUT!', '#f43f5e', 28);
      window.setTimeout(() => {
        if (running) onDefeat?.();
      }, 900);
    }
    syncHud();
  }

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (paused || ended) return;
    const isRepeat = e.repeat || keys.has(e.code);
    keys.add(e.code);

    if (
      (e.code === 'KeyJ' || e.code === 'Space') &&
      !isRepeat &&
      canPlayerAct() &&
      !player.grabbingEnemy &&
      !player.isFlying &&
      player.z <= 0.5
    ) {
      player.vz = 620;
      player.z = 1;
      if (player.state === 'duck') player.state = 'idle';
      playJump();
      spawnParticles(player.x, player.y, '#cbd5e1', 6);
    } else if (e.code === 'KeyD' && canPlayerAct() && !player.grabbingEnemy && player.z <= 0.5) {
      player.state = 'duck';
      player.stateTimer = 0.35;
    } else if (e.code === 'KeyS' && canPlayerAct() && !isRepeat && !player.grabbingEnemy) {
      player.state = 'sidestep';
      player.stateTimer = 0.26;
      player.invulnTimer = 0.24;
      player.sidestepDir = keys.has('ArrowUp') ? -1 : keys.has('ArrowDown') ? 1 : player.y > initRing.centerY ? -1 : 1;
      playDodge();
    } else if (e.code === 'KeyK' && !isRepeat) {
      triggerAttack('kick');
    } else if (e.code === 'KeyG' && !isRepeat) {
      triggerAttack('grab');
    } else if (e.code === 'KeyP' && !isRepeat) {
      triggerAttack('throw');
    } else if (e.code === 'KeyU' && !isRepeat) {
      triggerAttack('brick');
    } else if (e.code === 'KeyF' && !isRepeat) {
      triggerAttack('flight');
    } else if (e.code === 'KeyR' && !isRepeat) {
      triggerAttack('bulletMode');
    } else if (e.code === 'KeyT' && canPlayerAct()) {
      player.spinGraceTimer = 0.28;
    }
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function onBlur() {
    keys.clear();
  }

  function onMouseDown(e) {
    if (paused || ended) return;
    if (e.button === 0) {
      triggerAttack('leftPunch');
    } else if (e.button === 2) {
      e.preventDefault();
      triggerAttack('rightPunch');
    }
  }

  function onContextMenu(e) {
    e.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('contextmenu', onContextMenu);

  window.__DEMOLISHER_STATE__ = () => ({
    mode: 'combat',
    x: player.x,
    y: player.y,
    z: player.z,
    vz: player.vz,
    state: player.state,
    introTimer
  });

  // Bell at match start
  playBell();

  let prevTs = performance.now();

  function update(dt, ring) {
    time += dt;
    screenShake = Math.max(0, screenShake - 28 * dt);
    ropeBounce = Math.max(0, ropeBounce - 14 * dt);
    crowdExcitement = Math.max(0.25, crowdExcitement - 0.16 * dt);

    if (introTimer > 0) {
      introTimer = Math.max(0, introTimer - dt);
      syncHud();
      return;
    }

    // Cooldowns & timers
    player.hurtFlash = Math.max(0, player.hurtFlash - dt);
    enemy.hurtFlash = Math.max(0, enemy.hurtFlash - dt);
    player.invulnTimer = Math.max(0, player.invulnTimer - dt);
    enemy.invulnTimer = Math.max(0, enemy.invulnTimer - dt);
    player.brickCooldown = Math.max(0, player.brickCooldown - dt);
    player.bulletCooldown = Math.max(0, player.bulletCooldown - dt);
    player.bulletBuffTimer = Math.max(0, player.bulletBuffTimer - dt);

    // Facing auto-orientation (unless mid-attack or spinning)
    if (!['leftPunch', 'rightPunch', 'kick', 'spin', 'throw'].includes(player.state) && !ended) {
      player.facing = enemy.x >= player.x ? 1 : -1;
    }
    if (!['attack', 'telegraph', 'hurt', 'ko'].includes(enemy.state) && !ended) {
      enemy.facing = player.x >= enemy.x ? 1 : -1;
    }

    // Player spin handling (T held or tapped continuously)
    const holdingT = keys.has('KeyT');
    if (holdingT && canPlayerAct() && !player.grabbingEnemy) {
      player.spinGraceTimer = 0.25;
    } else {
      player.spinGraceTimer = Math.max(0, player.spinGraceTimer - dt);
    }

    const spinningActive =
      !ended &&
      canPlayerAct() &&
      !player.grabbingEnemy &&
      (holdingT || player.spinGraceTimer > 0) &&
      !['leftPunch', 'rightPunch', 'bulletPunch', 'kick', 'grab', 'brickThrow'].includes(player.state);

    if (spinningActive) {
      player.state = 'spin';
      player.spinAngle += dt * 15;
      player.continuousSpinTime += dt;
      player.spinSoundAccum += dt;
      if (player.spinSoundAccum >= 0.24) {
        player.spinSoundAccum = 0;
        playSpinTick();
      }
      if (player.continuousSpinTime >= 10 && !player.spin10Unlocked) {
        player.spin10Unlocked = true;
        addFloatingText(player.x, player.y - 120, '10s SPIN ACHIEVEMENT!', '#22c55e', 20);
        onSpin10Seconds?.();
      }
    } else {
      if (player.state === 'spin') player.state = 'idle';
      player.continuousSpinTime = 0;
      player.spinSoundAccum = 0;
    }

    // Player Duck hold
    if (keys.has('KeyD') && canPlayerAct() && !player.grabbingEnemy && player.state !== 'spin' && player.z <= 0.5) {
      if (['idle', 'walk', 'duck'].includes(player.state)) {
        player.state = 'duck';
        player.stateTimer = 0.12;
      }
    }

    // Player movement (ground or aerial flight)
    if (!ended && !player.grabbingEnemy && !['hurt', 'ko', 'throw'].includes(player.state)) {
      let mx = 0;
      let my = 0;
      if (keys.has('ArrowLeft')) mx -= 1;
      if (keys.has('ArrowRight')) mx += 1;
      if (keys.has('ArrowUp')) my -= 1;
      if (keys.has('ArrowDown')) my += 1;

      if (mx !== 0 || my !== 0) {
        const len = Math.hypot(mx, my);
        mx /= len;
        my /= len;
        const speed = player.isFlying ? 320 : player.state === 'duck' ? 115 : 265;
        player.x += mx * speed * dt;

        if (player.isFlying) {
          // Arrow Up/Down steers altitude in flight!
          player.z = Math.max(30, Math.min(185, player.z - my * 230 * dt));
        } else {
          player.y += my * 155 * dt;
        }

        if (player.state === 'idle') player.state = 'walk';
      } else if (player.state === 'walk') {
        player.state = 'idle';
      }
    }

    if (player.isFlying) {
      player.vz = 0;
    } else if (player.z > 0 || player.vz > 0) {
      player.vz -= 1500 * dt;
      player.z += player.vz * dt;
      if (player.z <= 0) {
        player.z = 0;
        player.vz = 0;
      }
    }

    // Sidestep lateral motion
    if (player.state === 'sidestep') {
      player.y += player.sidestepDir * 290 * dt;
      player.sidestepOffset = Math.sin((player.stateTimer / 0.26) * Math.PI) * 28 * player.sidestepDir;
    } else {
      player.sidestepOffset = 0;
    }

    // Clamp player within ring
    player.x = Math.max(ring.playMinX, Math.min(ring.playMaxX, player.x));
    player.y = Math.max(ring.playMinY, Math.min(ring.playMaxY, player.y));

    // Player state timer & active attack hit detection
    if (player.stateTimer > 0) {
      player.stateTimer -= dt;
      if (
        !player.attackHitDelivered &&
        ['leftPunch', 'rightPunch', 'bulletPunch', 'kick', 'grab'].includes(player.state)
      ) {
        const reach = player.state === 'kick' ? 105 : player.state === 'grab' ? 88 : 92;
        const dx = (enemy.x - player.x) * player.facing;
        const dy = Math.abs(enemy.y - player.y);
        const dz = Math.abs(enemy.z - player.z);
        if (dx > -18 && dx <= reach && dy < 54 && dz < 88) {
          player.attackHitDelivered = true;
          if (player.state === 'grab') {
            player.grabbingEnemy = true;
            player.grabTimer = 2.0;
            enemy.telegraphType = null;
            enemy.state = 'hurt';
            enemy.stateTimer = 2.0;
            enemy.x = player.x + player.facing * 52;
            enemy.y = player.y;
            addFloatingText(enemy.x, enemy.y - 90, 'GRABBED! Press [P] Throw!', '#38bdf8', 16);
            onGrabLanded?.();
          } else if (player.state === 'kick') {
            damageEnemy(calcDamage('kick'), 'POW!', '#fb923c', 55);
            onKickLanded?.();
          } else {
            const isHeavy = player.state === 'rightPunch';
            const dmg = calcDamage(player.state);
            damageEnemy(dmg, isHeavy ? 'SMASH!' : 'BAM!', isHeavy ? '#ffd43b' : '#38bdf8', isHeavy ? 52 : 28);
            onPunchLanded?.();
          }
        }
      }

      if (player.stateTimer <= 0 && !['spin'].includes(player.state)) {
        player.state = 'idle';
      }
    }

    // Grapple hold timer
    if (player.grabbingEnemy) {
      player.grabTimer -= dt;
      enemy.x = player.x + player.facing * 52;
      enemy.y = player.y;
      if (player.grabTimer <= 0) {
        player.grabbingEnemy = false;
        enemy.state = 'idle';
      }
    }

    // Enemy gravity
    if (enemy.z > 0) {
      enemy.z = Math.max(0, enemy.z - 260 * dt);
    }

    // Enemy AI — guaranteed to initiate the first attack at round start!
    updateEnemyAI(dt, ring);

    // Update projectiles (player bricks + enemy energy projectiles)
    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const p = projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += 14 * dt;

      if (p.owner === 'player') {
        const hit =
          Math.abs(p.x - enemy.x) < 36 &&
          Math.abs(p.y - enemy.y) < 46 &&
          Math.abs((p.z || 40) - (enemy.z + 45)) < 68;
        if (hit) {
          damageEnemy(p.damage, 'BRICK!', '#ef4444', 70);
          projectiles.splice(i, 1);
          continue;
        }
      } else {
        const hit =
          Math.abs(p.x - player.x) < 32 &&
          Math.abs(p.y - player.y) < 34 &&
          Math.abs((p.z || 46) - (player.z + 46)) < 48;
        if (hit) {
          if (player.state === 'duck' || player.state === 'sidestep') {
            addFloatingText(player.x, player.y - player.z - 92, 'EVADED!', '#38bdf8', 18);
            playDodge();
            projectiles.splice(i, 1);
            continue;
          }
          damagePlayer(p.damage, 'BLAST!');
          projectiles.splice(i, 1);
          continue;
        }
      }

      if (p.x < -40 || p.x > ring.playMaxX + 120) {
        projectiles.splice(i, 1);
      }
    }

    // Update particles & floating texts
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const pt = particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 320 * dt;
      pt.life -= dt;
      if (pt.life <= 0) particles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
      const ft = floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    brickSpinAngle += dt * 10;
    syncHud();
  }

  function updateEnemyAI(dt, ring) {
    if (ended || player.grabbingEnemy) return;

    if (enemy.state === 'hurt') {
      enemy.stateTimer -= dt;
      if (enemy.stateTimer <= 0) {
        enemy.state = 'idle';
      }
      enemy.x = Math.max(ring.playMinX, Math.min(ring.playMaxX, enemy.x));
      return;
    }

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    // Telegraphing an attack
    if (enemy.state === 'telegraph') {
      enemy.telegraphTimer -= dt;
      if (enemy.telegraphTimer <= 0) {
        enemy.state = 'attack';
        enemy.stateTimer = enemy.telegraphType === 'chargeRush' ? 0.34 : 0.28;
        enemy.attackHitDelivered = false;
        enemy.rushDir = dx >= 0 ? 1 : -1;

        if (enemy.telegraphType === 'projectile') {
          projectiles.push({
            owner: 'enemy',
            kind: 'energy',
            x: enemy.x + enemy.facing * 32,
            y: enemy.y,
            z: 52,
            vx: enemy.facing * 430,
            vy: 0,
            color: enemy.outfitSecondary,
            damage: enemy.damage
          });
          enemy.attackHitDelivered = true;
        }
        enemy.telegraphType = null;
      }
      return;
    }

    // Executing attack
    if (enemy.state === 'attack') {
      enemy.stateTimer -= dt;
      if (enemy.lastMove === 'chargeRush' || enemy.lastMove === 'spinLariat') {
        enemy.x += enemy.rushDir * 440 * dt;
      } else if (enemy.lastMove === 'jumpSlam') {
        enemy.x += enemy.rushDir * 300 * dt;
        enemy.z = Math.sin((enemy.stateTimer / 0.28) * Math.PI) * 65;
      }

      if (!enemy.attackHitDelivered) {
        const hitX = Math.abs(player.x - enemy.x) < 88;
        const hitY = Math.abs(player.y - enemy.y) < 42;
        const highAttack = enemy.lastMove === 'highStrike';
        const groundOnly = enemy.lastMove !== 'jumpSlam' && enemy.lastMove !== 'highStrike';

        if (hitX && hitY) {
          if (highAttack && player.state === 'duck') {
            enemy.attackHitDelivered = true;
            addFloatingText(player.x, player.y - player.z - 94, 'DUCKED!', '#22c55e', 19);
            playDodge();
          } else if (player.state === 'sidestep') {
            enemy.attackHitDelivered = true;
            addFloatingText(player.x, player.y - player.z - 94, 'SIDESTEPPED!', '#38bdf8', 19);
            playDodge();
          } else if (player.z > 42 && groundOnly) {
            enemy.attackHitDelivered = true;
            addFloatingText(
              player.x,
              player.y - player.z - 94,
              player.isFlying ? 'AIR EVADE!' : 'JUMPED OVER!',
              '#38bdf8',
              17
            );
            playDodge();
          } else if (Math.abs(player.z - enemy.z) < 72) {
            enemy.attackHitDelivered = true;
            damagePlayer(enemy.damage, 'STRIKE!');
          }
        }
      }

      if (enemy.stateTimer <= 0) {
        enemy.state = 'idle';
        enemy.z = 0;
        enemy.aiCooldown = Math.max(0.45, 1.35 / enemy.aggression);
      }
      enemy.x = Math.max(ring.playMinX, Math.min(ring.playMaxX, enemy.x));
      return;
    }

    // First-attack guarantee + regular AI loop
    enemy.aiCooldown -= dt;

    if (enemy.mustInitiateFirstAttack) {
      // Rush straight into range and throw the opening strike immediately!
      if (dist > 118) {
        const speed = 340 * (enemy.speedFactor || 1);
        enemy.x += (dx / dist) * speed * dt;
        enemy.y += (dy / dist) * speed * 0.65 * dt;
        enemy.state = 'walk';
      } else {
        enemy.mustInitiateFirstAttack = false;
        beginEnemyTelegraph(enemy.signatureMove || 'highStrike');
      }
      enemy.x = Math.max(ring.playMinX, Math.min(ring.playMaxX, enemy.x));
      enemy.y = Math.max(ring.playMinY, Math.min(ring.playMaxY, enemy.y));
      return;
    }

    if (enemy.aiCooldown <= 0 && (dist < 135 || enemy.signatureMove === 'projectile' || enemy.signatureMove === 'chargeRush')) {
      const movePool = [enemy.signatureMove || 'highStrike', 'highStrike', 'chargeRush'];
      const chosen = movePool[Math.floor(Math.random() * movePool.length)];
      if (chosen !== 'projectile' && chosen !== 'chargeRush' && dist > 110) {
        // Close distance first
      } else {
        beginEnemyTelegraph(chosen);
        return;
      }
    }

    // Pursue player
    if (dist > 82) {
      const spd = 175 * (enemy.speedFactor || 1) * Math.min(1.3, 0.8 + enemy.aggression * 0.25);
      enemy.x += (dx / dist) * spd * dt;
      enemy.y += (dy / dist) * spd * 0.65 * dt;
      enemy.state = 'walk';
    } else {
      enemy.state = 'idle';
    }

    enemy.x = Math.max(ring.playMinX, Math.min(ring.playMaxX, enemy.x));
    enemy.y = Math.max(ring.playMinY, Math.min(ring.playMaxY, enemy.y));
  }

  function beginEnemyTelegraph(moveType) {
    enemy.lastMove = moveType;
    enemy.telegraphType = moveType;
    enemy.telegraphDuration = Math.max(0.45, 0.78 - (enemy.aggression - 0.65) * 0.22);
    enemy.telegraphTimer = enemy.telegraphDuration;
    enemy.state = 'telegraph';
  }

  function render() {
    const { width: w, height: h } = resizeCanvas(canvas);
    const ctx = canvas.getContext('2d');

    ctx.save();
    if (screenShake > 0.2) {
      ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    }

    const arena = drawArenaBackground(ctx, w, h, time, crowdExcitement, {
      bannerText: `LEVEL ${level} • ROUND ${round} • ${difficultyName.toUpperCase()}`,
      ropeBounce
    });

    // Depth sort fighters by Y
    const fighters = [
      { ...player, brickSpinAngle },
      {
        ...enemy,
        telegraphProgress: enemy.telegraphType ? 1 - enemy.telegraphTimer / enemy.telegraphDuration : 0,
        state: enemy.state === 'telegraph' ? 'idle' : enemy.state === 'attack' ? 'rightPunch' : enemy.state
      }
    ].sort((a, b) => a.y - b.y);

    for (const f of fighters) {
      drawFighter(ctx, f, time);
    }

    drawProjectiles(ctx, projectiles);
    drawParticles(ctx, particles);
    arena.drawForegroundRopes();
    drawFloatingTexts(ctx, floatingTexts);

    // Intro banner overlay
    if (introTimer > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(10, 7, 22, 0.68)';
      ctx.fillRect(0, h * 0.34, w, 92);
      ctx.fillStyle = '#ffd43b';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 6;
      ctx.font = '900 38px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const msg = introTimer > 0.45 ? `ROUND ${round}` : 'FIGHT!';
      ctx.strokeText(msg, w * 0.5, h * 0.34 + 46);
      ctx.fillText(msg, w * 0.5, h * 0.34 + 46);
      ctx.restore();
    }

    ctx.restore();
  }

  function frame(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - prevTs) / 1000);
    prevTs = ts;
    const { width: w, height: h } = resizeCanvas(canvas);
    const ring = getRingMetrics(w, h);
    if (!paused) {
      update(dt, ring);
    }
    render();
    rafId = requestAnimationFrame(frame);
  }

  syncHud();
  rafId = requestAnimationFrame(frame);

  return {
    setPaused(val) {
      paused = Boolean(val);
    },
    destroy() {
      running = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      delete window.__DEMOLISHER_STATE__;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('contextmenu', onContextMenu);
    }
  };
}
