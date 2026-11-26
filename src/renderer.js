/**
 * Shared Canvas 2D renderer for stadium arena, animated audience, wrestling ring,
 * articulated fighters, special effects, projectiles, and floating comic texts.
 */

export function resizeCanvas(canvas) {
  if (!canvas) return { width: 960, height: 540 };
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(320, Math.round(rect.width));
  const h = Math.max(200, Math.round(rect.height));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width: w, height: h };
}

export function getRingMetrics(w, h) {
  const matTop = h * 0.56;
  const matBottom = h * 0.91;
  const topLeftX = w * 0.14;
  const topRightX = w * 0.86;
  const bottomLeftX = w * 0.05;
  const bottomRightX = w * 0.95;
  return {
    matTop,
    matBottom,
    topLeftX,
    topRightX,
    bottomLeftX,
    bottomRightX,
    centerX: w * 0.5,
    centerY: (matTop + matBottom) * 0.5,
    playMinX: w * 0.14,
    playMaxX: w * 0.86,
    playMinY: h * 0.62,
    playMaxY: h * 0.86
  };
}

const CROWD_PALETTE = [
  '#f43f5e',
  '#38bdf8',
  '#facc15',
  '#a855f7',
  '#22c55e',
  '#fb923c',
  '#e2e8f0',
  '#ec4899'
];

export function drawArenaBackground(ctx, w, h, time, excitement = 0.25, opts = {}) {
  const ring = getRingMetrics(w, h);
  const audienceBottom = opts.audienceBottom ?? ring.matTop - 22;

  // Stadium backdrop gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, '#070514');
  skyGrad.addColorStop(0.5, '#171036');
  skyGrad.addColorStop(1, '#090616');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Overhead truss & arena rafters
  ctx.fillStyle = '#0e0b20';
  ctx.fillRect(0, 0, w, h * 0.09);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  for (let x = 0; x < w; x += 56) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 28, h * 0.09);
    ctx.lineTo(x + 56, 0);
    ctx.stroke();
  }

  // Sweeping spotlights
  const beamOrigins = [w * 0.18, w * 0.5, w * 0.82];
  beamOrigins.forEach((bx, idx) => {
    const sway = Math.sin(time * (0.9 + idx * 0.25) + idx * 2) * w * 0.11;
    const beamGrad = ctx.createLinearGradient(bx, 0, bx + sway, ring.matBottom);
    beamGrad.addColorStop(0, idx === 1 ? 'rgba(255, 212, 59, 0.18)' : 'rgba(56, 189, 248, 0.13)');
    beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(bx - 16, 0);
    ctx.lineTo(bx + 16, 0);
    ctx.lineTo(bx + sway + w * 0.16, ring.matBottom);
    ctx.lineTo(bx + sway - w * 0.16, ring.matBottom);
    ctx.closePath();
    ctx.fill();
  });

  // Jumbotron banner in the back
  const jbW = Math.min(280, w * 0.34);
  const jbH = 44;
  const jbX = (w - jbW) * 0.5;
  const jbY = h * 0.07;
  ctx.fillStyle = '#111827';
  ctx.strokeStyle = '#ffd43b';
  ctx.lineWidth = 2.5;
  roundRect(ctx, jbX, jbY, jbW, jbH, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd43b';
  ctx.font = '900 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.bannerText || 'DEMOLISHER CHAMPIONSHIP ARENA', w * 0.5, jbY + jbH * 0.5);

  // Animated audience tiers above the ring & main menu buttons
  const rows = 3;
  const startY = Math.max(jbY + jbH + 18, audienceBottom - 86);
  const rowStep = (audienceBottom - startY) / rows;

  for (let r = 0; r < rows; r += 1) {
    const rowY = startY + r * rowStep;
    const cols = Math.floor(w / 28) + 2;
    const shade = 0.52 + r * 0.18;

    // Bleacher tier bar
    ctx.fillStyle = r === 0 ? '#110d24' : r === 1 ? '#171230' : '#1e183d';
    ctx.fillRect(0, rowY - 4, w, rowStep + 14);

    for (let c = 0; c < cols; c += 1) {
      const seed = r * 97 + c * 31;
      const px = c * 28 + ((r % 2) * 14) + ((seed % 7) - 3);
      const jumpFreq = 3.6 + (seed % 5) * 0.7 + excitement * 4;
      const bounce = Math.abs(Math.sin(time * jumpFreq + seed)) * (3.5 + excitement * 11);
      const py = rowY + 14 - bounce;
      const shirtColor = CROWD_PALETTE[seed % CROWD_PALETTE.length];

      ctx.save();
      ctx.globalAlpha = shade;

      // Torso
      ctx.fillStyle = shirtColor;
      roundRect(ctx, px - 8, py, 16, 18, 5);
      ctx.fill();

      // Head
      ctx.fillStyle = seed % 3 === 0 ? '#d99b66' : seed % 3 === 1 ? '#f1c27d' : '#8d5524';
      ctx.beginPath();
      ctx.arc(px, py - 5, 6.2, 0, Math.PI * 2);
      ctx.fill();

      // Cheering raised arms
      if ((seed + Math.floor(time * 2.5)) % 3 !== 0) {
        const wave = Math.sin(time * 8 + seed) * 3;
        ctx.strokeStyle = shirtColor;
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px - 6, py + 4);
        ctx.lineTo(px - 11, py - 6 + wave);
        ctx.moveTo(px + 6, py + 4);
        ctx.lineTo(px + 11, py - 6 - wave);
        ctx.stroke();
      }

      // Occasional fan sign
      if (r === 1 && c % 9 === 4) {
        ctx.fillStyle = '#ffd43b';
        ctx.fillRect(px - 11, py - 21, 22, 11);
        ctx.fillStyle = '#111827';
        ctx.font = '900 7px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('KO!', px, py - 15);
      }

      ctx.restore();
    }
  }

  // Camera flash pops in the crowd
  const flashIndex = Math.floor(time * 4.5);
  for (let f = 0; f < 2; f += 1) {
    const fx = ((flashIndex * 193 + f * 347) % Math.max(100, w - 40)) + 20;
    const fy = startY + ((flashIndex * 71 + f * 29) % Math.max(20, audienceBottom - startY));
    const pulse = (time * 4.5) % 1;
    if (pulse < 0.25) {
      const alpha = (0.25 - pulse) * 3.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 8 * (1 - pulse * 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Guardrail separating crowd and ring apron
  ctx.fillStyle = '#2b244d';
  ctx.fillRect(0, ring.matTop - 22, w, 14);
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, ring.matTop - 22, w, 3);

  // Ring apron / base skirt
  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.moveTo(ring.bottomLeftX, ring.matBottom);
  ctx.lineTo(ring.bottomRightX, ring.matBottom);
  ctx.lineTo(ring.bottomRightX + 12, h);
  ctx.lineTo(ring.bottomLeftX - 12, h);
  ctx.closePath();
  ctx.fill();

  // Apron banner text
  ctx.fillStyle = 'rgba(255, 212, 59, 0.85)';
  ctx.font = '900 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★ DEMOLISHER GRAND PRIX ★', w * 0.5, Math.min(h - 10, ring.matBottom + 24));

  // Ring canvas mat
  const matGrad = ctx.createLinearGradient(0, ring.matTop, 0, ring.matBottom);
  matGrad.addColorStop(0, '#1d4ed8');
  matGrad.addColorStop(0.65, '#2563eb');
  matGrad.addColorStop(1, '#1e40af');
  ctx.fillStyle = matGrad;
  ctx.beginPath();
  ctx.moveTo(ring.topLeftX, ring.matTop);
  ctx.lineTo(ring.topRightX, ring.matTop);
  ctx.lineTo(ring.bottomRightX, ring.matBottom);
  ctx.lineTo(ring.bottomLeftX, ring.matBottom);
  ctx.closePath();
  ctx.fill();

  // Mat inner border & center emblem
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  ctx.translate(ring.centerX, ring.centerY);
  ctx.scale(1, 0.36);
  ctx.strokeStyle = 'rgba(255, 212, 59, 0.45)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, Math.min(w * 0.14, 110), 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 212, 59, 0.12)';
  ctx.fill();
  ctx.restore();

  // Back ring posts & ropes
  const backPostH = 82;
  const frontPostH = 86;
  drawCornerPost(ctx, ring.topLeftX, ring.matTop, backPostH, '#ef4444');
  drawCornerPost(ctx, ring.topRightX, ring.matTop, backPostH, '#38bdf8');

  const ropeColors = ['#ef4444', '#f8fafc', '#3b82f6'];
  const ropeSag = opts.ropeBounce || 0;
  ropeColors.forEach((col, i) => {
    const offset = 22 + i * 24;
    ctx.strokeStyle = col;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(ring.topLeftX, ring.matTop - offset);
    ctx.quadraticCurveTo(
      ring.centerX,
      ring.matTop - offset + Math.sin(time * 7 + i) * ropeSag,
      ring.topRightX,
      ring.matTop - offset
    );
    ctx.stroke();
  });

  // Side ropes (drawn behind foreground fighters)
  ropeColors.forEach((col, i) => {
    const offsetBack = 22 + i * 24;
    const offsetFront = 24 + i * 25;
    ctx.strokeStyle = col;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ring.topLeftX, ring.matTop - offsetBack);
    ctx.lineTo(ring.bottomLeftX, ring.matBottom - offsetFront);
    ctx.moveTo(ring.topRightX, ring.matTop - offsetBack);
    ctx.lineTo(ring.bottomRightX, ring.matBottom - offsetFront);
    ctx.stroke();
  });

  return {
    ring,
    drawForegroundRopes: () => {
      drawCornerPost(ctx, ring.bottomLeftX, ring.matBottom, frontPostH, '#ef4444');
      drawCornerPost(ctx, ring.bottomRightX, ring.matBottom, frontPostH, '#38bdf8');
      ropeColors.forEach((col, i) => {
        const offset = 24 + i * 25;
        ctx.strokeStyle = col;
        ctx.lineWidth = 4.5;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.moveTo(ring.bottomLeftX, ring.matBottom - offset);
        ctx.lineTo(ring.bottomRightX, ring.matBottom - offset);
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    }
  };
}

function drawCornerPost(ctx, x, y, height, padColor) {
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(x - 5, y - height, 10, height);
  ctx.fillStyle = padColor;
  roundRect(ctx, x - 9, y - height + 12, 18, height - 22, 5);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * Draws an articulated cartoon-arcade wrestler with clear poses for every PRD action.
 */
export function drawFighter(ctx, fighter, time) {
  const {
    x,
    y,
    z = 0, // height off mat (for jumps / flight)
    facing = 1,
    scale = 1,
    state = 'idle',
    stateTimer = 0,
    skinColor = '#f0b884',
    outfitPrimary = '#e11d48',
    outfitSecondary = '#ffd43b',
    maskType = 'spiky',
    cape = false,
    hasGauntlet = false,
    isFlying = false,
    bulletBuffTimer = 0,
    spinAngle = 0,
    continuousSpinTime = 0,
    tiltAngle = 0,
    hurtFlash = 0,
    telegraphType = null,
    telegraphProgress = 0,
    sidestepOffset = 0,
    noShadow = false
  } = fighter;

  const drawX = x;
  const drawY = y - z + sidestepOffset * 0.25;

  // Ground shadow
  if (!noShadow) {
    const shadowScale = Math.max(0.35, 1 - z / 240);
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${0.36 * shadowScale})`;
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 34 * scale * shadowScale, 11 * scale * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Sidestep speed afterimage
  if (state === 'sidestep') {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(drawX - facing * 18, drawY - 46 * scale, 22 * scale, 40 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Flight jet aura
  if (isFlying) {
    ctx.save();
    const auraPulse = 0.8 + Math.sin(time * 14) * 0.2;
    ctx.fillStyle = `rgba(56, 189, 248, ${0.22 * auraPulse})`;
    ctx.beginPath();
    ctx.ellipse(drawX, drawY - 38 * scale, 40 * scale, 52 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Bullet Punch fiery aura
  if (bulletBuffTimer > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(drawX, drawY - 45 * scale, 42 * scale + Math.sin(time * 24) * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(drawX, drawY);

  // Spin / Aerial rotation handling
  let flipX = facing;
  if (state === 'spin') {
    const cosSpin = Math.cos(spinAngle);
    flipX = (cosSpin >= 0 ? 1 : -1) * Math.max(0.28, Math.abs(cosSpin));
  }
  if (tiltAngle) {
    ctx.translate(0, -44 * scale);
    ctx.rotate(tiltAngle);
    ctx.translate(0, 44 * scale);
  }

  if (state === 'ko') {
    ctx.translate(0, -14 * scale);
    ctx.rotate(-facing * Math.PI * 0.46);
    ctx.translate(0, 14 * scale);
  }

  ctx.scale(flipX * scale, scale);

  const bob =
    state === 'idle'
      ? Math.sin(time * 6) * 2.5
      : state === 'walk'
        ? Math.abs(Math.sin(time * 13)) * 5
        : isFlying
          ? Math.sin(time * 8) * 5
          : 0;
  const crouchY = state === 'duck' ? 24 : 0;
  const torsoAngle =
    state === 'duck'
      ? 0.35
      : state === 'leftPunch' || state === 'rightPunch' || state === 'bulletPunch'
        ? 0.16
        : state === 'kick'
          ? -0.22
          : isFlying
            ? 0.25
            : 0;

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const outline = hurtFlash > 0 ? '#ffffff' : '#0f172a';
  const fillSkin = hurtFlash > 0 ? '#ffffff' : skinColor;
  const fillPrimary = hurtFlash > 0 ? '#fef08a' : outfitPrimary;
  const fillSecondary = hurtFlash > 0 ? '#ffffff' : outfitSecondary;

  // Optional flowing cape
  if (cape) {
    ctx.fillStyle = fillSecondary;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const flutter = Math.sin(time * 9) * 7;
    ctx.moveTo(-12, -72 + bob + crouchY);
    ctx.quadraticCurveTo(-36, -44 + flutter, -30, -10 + flutter);
    ctx.lineTo(-10, -24 + crouchY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Back leg
  const walkSwing = state === 'walk' ? Math.sin(time * 13) * 14 : 0;
  const legLift = z > 12 && !isFlying ? Math.min(10, z * 0.12) : 0;
  drawLeg(ctx, -10 - walkSwing * 0.4, -26 + crouchY * 0.5, -14 - walkSwing, -2 - legLift, fillSkin, fillPrimary, outline);

  // Front leg (or Kick extension!)
  if (state === 'kick') {
    ctx.save();
    ctx.translate(8, -32);
    ctx.rotate(-0.45);
    drawLeg(ctx, 0, 0, 44, -8, fillSkin, fillPrimary, outline);
    // Impact shockwave on boot
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(46, -8, 12, -1, 1);
    ctx.stroke();
    ctx.restore();
  } else {
    drawLeg(ctx, 10 + walkSwing * 0.4, -26 + crouchY * 0.5, 13 + walkSwing, -2 - legLift, fillSkin, fillPrimary, outline);
  }

  // Torso + Trunks + Belt
  ctx.save();
  ctx.translate(0, -32 + bob + crouchY);
  ctx.rotate(torsoAngle);

  // Trunks
  ctx.fillStyle = fillPrimary;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.8;
  roundRect(ctx, -19, -8, 38, 18, 6);
  ctx.fill();
  ctx.stroke();

  // Championship belt
  ctx.fillStyle = fillSecondary;
  ctx.fillRect(-19, -11, 38, 6);
  ctx.strokeRect(-19, -11, 38, 6);

  // Muscular upper torso
  ctx.fillStyle = fillSkin;
  ctx.beginPath();
  ctx.moveTo(-17, -11);
  ctx.lineTo(-24, -44);
  ctx.quadraticCurveTo(0, -52, 24, -44);
  ctx.lineTo(17, -11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Singlet / chest straps for non-player or stylized chest stripe
  ctx.fillStyle = fillPrimary;
  ctx.beginPath();
  ctx.moveTo(-13, -46);
  ctx.lineTo(-5, -46);
  ctx.lineTo(-8, -11);
  ctx.lineTo(-15, -11);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(13, -46);
  ctx.lineTo(5, -46);
  ctx.lineTo(8, -11);
  ctx.lineTo(15, -11);
  ctx.closePath();
  ctx.fill();

  // Back arm
  const backPunch = state === 'rightPunch' || state === 'bulletPunch';
  const backArmAngle =
    state === 'grab'
      ? -0.2
      : backPunch
        ? -0.1
        : state === 'throw'
          ? -2.2
          : 0.45;
  const backArmReach = backPunch ? 48 : state === 'grab' ? 38 : 24;
  drawArm(ctx, -16, -40, backArmAngle, backArmReach, fillSkin, fillPrimary, fillSecondary, outline, hasGauntlet);

  // Head & Mask
  drawHead(ctx, 0, -61, fillSkin, fillPrimary, fillSecondary, outline, maskType, state);

  // Front arm
  const frontPunch = state === 'leftPunch' || state === 'bulletPunch';
  const frontArmAngle =
    state === 'grab'
      ? 0.08
      : frontPunch
        ? -0.04
        : state === 'brickThrow'
          ? -1.4
          : state === 'throw'
            ? -2.5
            : 0.28;
  const frontArmReach = frontPunch ? 50 : state === 'grab' ? 40 : 25;
  drawArm(ctx, 16, -38, frontArmAngle, frontArmReach, fillSkin, fillPrimary, fillSecondary, outline, hasGauntlet);

  // Bullet Punch multiple speed fists
  if (state === 'bulletPunch') {
    for (let i = 0; i < 3; i += 1) {
      const fy = -46 + i * 11 + Math.sin(time * 40 + i) * 4;
      const fx = 42 + ((i * 13 + Math.floor(time * 30)) % 22);
      ctx.fillStyle = hasGauntlet ? '#ffd43b' : '#fb923c';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fx, fy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
  ctx.restore();

  // Spin tornado swirl & 10s achievement progress ring
  if (state === 'spin') {
    ctx.save();
    ctx.strokeStyle = continuousSpinTime >= 10 ? '#22c55e' : '#38bdf8';
    ctx.lineWidth = 3;
    for (let i = 0; i < 2; i += 1) {
      ctx.beginPath();
      ctx.ellipse(
        drawX,
        drawY - (22 + i * 32) * scale,
        36 * scale,
        9 * scale,
        0,
        time * 12 + i,
        time * 12 + i + Math.PI * 1.4
      );
      ctx.stroke();
    }
    if (continuousSpinTime > 0.6) {
      const pct = Math.min(1, continuousSpinTime / 10);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      roundRect(ctx, drawX - 28, drawY - 122 * scale, 56, 18, 6);
      ctx.fill();
      ctx.fillStyle = pct >= 1 ? '#22c55e' : '#ffd43b';
      roundRect(ctx, drawX - 26, drawY - 120 * scale, 52 * pct, 14, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${continuousSpinTime.toFixed(1)}s`, drawX, drawY - 113 * scale);
    }
    ctx.restore();
  }

  // KO orbiting stars
  if (state === 'ko') {
    ctx.save();
    for (let s = 0; s < 3; s += 1) {
      const a = time * 5 + (s * Math.PI * 2) / 3;
      const sx = drawX + Math.cos(a) * 26;
      const sy = drawY - 46 + Math.sin(a) * 9;
      ctx.fillStyle = '#ffd43b';
      ctx.font = '900 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', sx, sy);
    }
    ctx.restore();
  }

  // Enemy attack telegraph banner
  if (telegraphType) {
    ctx.save();
    const isHigh = telegraphType === 'highStrike' || telegraphType === 'projectile';
    const badgeColor = isHigh ? '#fb923c' : '#38bdf8';
    const label = isHigh ? 'HIGH! [D] DUCK' : 'RUSH! [S] SIDESTEP';
    const pulse = 1 + Math.sin(time * 22) * 0.06;
    ctx.translate(drawX, drawY - 120 * scale);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = badgeColor;
    ctx.lineWidth = 2.5;
    roundRect(ctx, -64, -14, 128, 24, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = badgeColor;
    ctx.font = '900 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, -2);
    // Telegraph timer bar
    ctx.fillStyle = badgeColor;
    ctx.fillRect(-56, 7, 112 * Math.min(1, telegraphProgress), 3);
    ctx.restore();
  }
}

function drawLeg(ctx, x1, y1, x2, y2, skin, primary, outline) {
  ctx.strokeStyle = outline;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2 - 10);
  ctx.stroke();

  ctx.strokeStyle = skin;
  ctx.lineWidth = 9.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2 - 10);
  ctx.stroke();

  // Wrestling boot
  ctx.fillStyle = primary;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.5;
  roundRect(ctx, x2 - 7, y2 - 14, 19, 14, 5);
  ctx.fill();
  ctx.stroke();
}

function drawArm(ctx, sx, sy, angle, reach, skin, primary, secondary, outline, hasGauntlet) {
  const ex = sx + Math.cos(angle) * reach;
  const ey = sy + Math.sin(angle) * reach;

  ctx.strokeStyle = outline;
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  ctx.strokeStyle = skin;
  ctx.lineWidth = 8.5;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  // Glove / Golden Gauntlet
  const gloveRadius = hasGauntlet ? 11.5 : 8.5;
  ctx.fillStyle = hasGauntlet ? '#ffd43b' : primary;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(ex, ey, gloveRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (hasGauntlet) {
    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.arc(ex - 2, ey - 3, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ex, ey, gloveRadius + 2, -0.6, 0.9);
    ctx.stroke();
  }
}

function drawHead(ctx, hx, hy, skin, primary, secondary, outline, maskType, state) {
  ctx.fillStyle = skin;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.arc(hx, hy, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (maskType === 'luchador' || maskType === 'helmet') {
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.arc(hx, hy, 15, Math.PI * 0.9, Math.PI * 2.1);
    ctx.lineTo(hx + 14, hy + 4);
    ctx.lineTo(hx - 14, hy + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (maskType === 'spiky') {
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(hx - 14, hy - 6);
    ctx.lineTo(hx - 10, hy - 23);
    ctx.lineTo(hx - 2, hy - 14);
    ctx.lineTo(hx + 4, hy - 25);
    ctx.lineTo(hx + 10, hy - 13);
    ctx.lineTo(hx + 16, hy - 20);
    ctx.lineTo(hx + 14, hy - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Red headband
    ctx.fillStyle = primary;
    ctx.fillRect(hx - 14, hy - 11, 28, 5);
  } else if (maskType === 'mohawk') {
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.moveTo(hx - 5, hy - 13);
    ctx.lineTo(hx + 1, hy - 30);
    ctx.lineTo(hx + 9, hy - 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (maskType === 'horns') {
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.moveTo(hx - 11, hy - 10);
    ctx.quadraticCurveTo(hx - 24, hy - 22, hx - 16, hy - 30);
    ctx.quadraticCurveTo(hx - 12, hy - 18, hx - 5, hy - 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(hx + 11, hy - 10);
    ctx.quadraticCurveTo(hx + 24, hy - 22, hx + 16, hy - 30);
    ctx.quadraticCurveTo(hx + 12, hy - 18, hx + 5, hy - 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (maskType === 'crown') {
    ctx.fillStyle = '#ffd43b';
    ctx.beginPath();
    ctx.moveTo(hx - 12, hy - 12);
    ctx.lineTo(hx - 12, hy - 25);
    ctx.lineTo(hx - 4, hy - 18);
    ctx.lineTo(hx, hy - 28);
    ctx.lineTo(hx + 4, hy - 18);
    ctx.lineTo(hx + 12, hy - 25);
    ctx.lineTo(hx + 12, hy - 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (maskType === 'bandana') {
    ctx.fillStyle = primary;
    ctx.fillRect(hx - 15, hy - 14, 30, 8);
    ctx.strokeRect(hx - 15, hy - 14, 30, 8);
  }

  // Eyes / Visor
  if (maskType === 'visor') {
    ctx.fillStyle = secondary;
    roundRect(ctx, hx - 2, hy - 7, 16, 7, 3);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(hx + 6, hy - 3, 4.2, state === 'hurt' ? 1.5 : 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(hx + 7.5, hy - 3, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fierce brow / expression
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(hx + 2, hy - 7);
  ctx.lineTo(hx + 11, hy - 5);
  ctx.stroke();
}

export function drawProjectiles(ctx, projectiles) {
  for (const p of projectiles) {
    ctx.save();
    ctx.translate(p.x, p.y - (p.z || 0));
    ctx.rotate(p.angle || 0);
    if (p.kind === 'brick') {
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      roundRect(ctx, -14, -9, 28, 18, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(-9, -4, 7, 4);
      ctx.fillRect(2, -4, 7, 4);
    } else {
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, p.color || '#fb923c');
      grad.addColorStop(1, 'rgba(251, 146, 60, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawParticles(ctx, particles) {
  for (const pt of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawFloatingTexts(ctx, texts) {
  for (const ft of texts) {
    const alpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = `900 ${ft.size || 20}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#0f172a';
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color || '#ffd43b';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
