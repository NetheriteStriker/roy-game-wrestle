import { isMuted } from './storage.js';

let audioCtx = null;
let musicInterval = null;
let musicStep = 0;

function ensureContext() {
  if (isMuted()) return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone({
  type = 'square',
  freq = 440,
  endFreq = null,
  duration = 0.12,
  gain = 0.12,
  delay = 0
}) {
  const ctx = ensureContext();
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq !== null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
  }
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.linearRampToValueAtTime(gain, now + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playNoise(duration = 0.09, gain = 0.12, highpassFreq = 600) {
  const ctx = ensureContext();
  if (!ctx) return;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = highpassFreq;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, ctx.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  src.connect(filter);
  filter.connect(amp);
  amp.connect(ctx.destination);
  src.start();
}

export function playButtonClick() {
  playTone({ type: 'triangle', freq: 520, endFreq: 760, duration: 0.07, gain: 0.09 });
}

export function playPunch(heavy = false) {
  if (heavy) {
    playTone({ type: 'sawtooth', freq: 185, endFreq: 52, duration: 0.15, gain: 0.18 });
    playNoise(0.11, 0.15, 250);
  } else {
    playTone({ type: 'triangle', freq: 240, endFreq: 75, duration: 0.09, gain: 0.14 });
    playNoise(0.06, 0.11, 450);
  }
}

export function playKick() {
  playTone({ type: 'sawtooth', freq: 220, endFreq: 48, duration: 0.16, gain: 0.17 });
  playNoise(0.1, 0.14, 300);
}

export function playGrab() {
  playTone({ type: 'square', freq: 160, endFreq: 260, duration: 0.11, gain: 0.11 });
}

export function playThrow() {
  playTone({ type: 'sawtooth', freq: 340, endFreq: 65, duration: 0.25, gain: 0.18 });
  playNoise(0.18, 0.15, 200);
}

export function playBrick() {
  playTone({ type: 'triangle', freq: 500, endFreq: 210, duration: 0.14, gain: 0.13 });
}

export function playFlightToggle(active) {
  if (active) {
    playTone({ type: 'sine', freq: 280, endFreq: 740, duration: 0.22, gain: 0.12 });
  } else {
    playTone({ type: 'sine', freq: 520, endFreq: 210, duration: 0.18, gain: 0.11 });
  }
}

export function playJump() {
  playTone({ type: 'triangle', freq: 220, endFreq: 520, duration: 0.13, gain: 0.11 });
}

export function playSpinTick() {
  playTone({ type: 'sine', freq: 420, endFreq: 640, duration: 0.05, gain: 0.05 });
}

export function playDodge() {
  playTone({ type: 'sine', freq: 360, endFreq: 660, duration: 0.1, gain: 0.1 });
}

export function playHurt() {
  playTone({ type: 'sawtooth', freq: 145, endFreq: 55, duration: 0.18, gain: 0.18 });
  playNoise(0.12, 0.14, 200);
}

export function playBell() {
  playTone({ type: 'triangle', freq: 880, endFreq: 860, duration: 0.45, gain: 0.14 });
  playTone({ type: 'sine', freq: 1320, endFreq: 1300, duration: 0.4, gain: 0.08, delay: 0.01 });
}

export function playCoin() {
  playTone({ type: 'square', freq: 987, endFreq: 987, duration: 0.07, gain: 0.08 });
  playTone({ type: 'square', freq: 1318, endFreq: 1318, duration: 0.16, gain: 0.08, delay: 0.07 });
}

export function playSlice() {
  playNoise(0.08, 0.13, 1200);
  playTone({ type: 'sawtooth', freq: 720, endFreq: 180, duration: 0.12, gain: 0.1 });
}

export function playVictory() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((n, idx) => {
    playTone({ type: 'triangle', freq: n, duration: 0.18, gain: 0.12, delay: idx * 0.09 });
  });
}

export function playDefeat() {
  const notes = [392, 349.23, 311.13, 246.94];
  notes.forEach((n, idx) => {
    playTone({ type: 'sawtooth', freq: n, duration: 0.22, gain: 0.1, delay: idx * 0.13 });
  });
}

export function playAchievement() {
  const notes = [659.25, 880, 1174.66, 1567.98];
  notes.forEach((n, idx) => {
    playTone({ type: 'triangle', freq: n, duration: 0.2, gain: 0.11, delay: idx * 0.07 });
  });
}

export function startMusic(mode = 'arena') {
  stopMusic();
  const bassLine =
    mode === 'arena'
      ? [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83]
      : [130.81, 164.81, 196, 164.81, 146.83, 174.61, 220, 196];
  musicStep = 0;
  musicInterval = window.setInterval(() => {
    if (isMuted() || !audioCtx || audioCtx.state !== 'running') return;
    const freq = bassLine[musicStep % bassLine.length];
    playTone({ type: 'triangle', freq, duration: 0.16, gain: 0.032 });
    musicStep += 1;
  }, 240);
}

export function stopMusic() {
  if (musicInterval !== null) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

export function unlockAudioOnGesture() {
  ensureContext();
}
