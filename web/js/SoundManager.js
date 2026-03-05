// SoundManager.js — port of SoundMan.java + MusicThread.java
// Uses Web Audio API. Sound IDs match the Java constants exactly.

export const TAUNT01    = 0;
export const TAUNT02    = 1;
export const LASER01    = 11;
export const ROCKET01   = 12;
export const FIRE01     = 13;
export const ENEMYROCK  = 21;
export const ENEMYLASER = 22;
export const ENEMYFIRE  = 23;
export const EXPLOSION  = 31;
export const ENDGAME    = 32;

const CLIPS = new Array(50).fill(null);  // decoded AudioBuffers

let ctx = null;
let soundsOn = true;
let musicOn  = true;

// Current music source node (so we can stop it)
let musicNode = null;
let musicBuffer = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

// Preload all .wav files. Pass an object: { id: url, ... }
export async function loadSounds(urlMap) {
  const ac = getCtx();
  const entries = Object.entries(urlMap);
  await Promise.all(entries.map(async ([id, url]) => {
    try {
      const res = await fetch(url);
      const ab  = await res.arrayBuffer();
      CLIPS[Number(id)] = await ac.decodeAudioData(ab);
    } catch (e) {
      console.warn(`Could not load sound id=${id} from ${url}:`, e);
    }
  }));
}

export function setSoundsOn(on) { soundsOn = on; }
export function setMusicOn(on)  { musicOn  = on; }
export function isSoundsOn()    { return soundsOn; }
export function isMusicOn()     { return musicOn; }

export function playClip(id) {
  if (!soundsOn) return;
  const buf = CLIPS[id];
  if (!buf) return;
  const ac  = getCtx();
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.connect(ac.destination);
  src.start();
}

// Music: start looping a clip by id
export function startMusic(id) {
  stopMusic();
  if (!musicOn) return;
  const buf = CLIPS[id];
  if (!buf) return;
  const ac  = getCtx();
  musicBuffer = buf;
  musicNode = ac.createBufferSource();
  musicNode.buffer = buf;
  musicNode.loop   = true;
  musicNode.connect(ac.destination);
  musicNode.start();
}

// Play once (for end-game, etc.)
export function playOnce(id) {
  stopMusic();
  if (!musicOn) return;
  const buf = CLIPS[id];
  if (!buf) return;
  const ac  = getCtx();
  musicNode = ac.createBufferSource();
  musicNode.buffer = buf;
  musicNode.loop   = false;
  musicNode.connect(ac.destination);
  musicNode.start();
}

export function stopMusic() {
  if (musicNode) {
    try { musicNode.stop(); } catch (_) {}
    musicNode = null;
  }
}

// Unlock audio context on first user interaction (browser requirement)
export function unlockAudio() {
  const ac = getCtx();
  if (ac.state === 'suspended') ac.resume();
}

// Internal APIs for Game.js to inject decoded buffers and AudioContext
export function _setClip(id, buffer)   { CLIPS[id] = buffer; }
export function _setAudioCtx(ac)       { ctx = ac; }
export function _playMusic(buffer, ac) {
  stopMusic();
  if (!musicOn) return;
  ctx = ac;
  musicNode = ac.createBufferSource();
  musicNode.buffer = buffer;
  musicNode.loop   = true;
  musicNode.connect(ac.destination);
  try { musicNode.start(); } catch (e) { console.warn('Music start failed:', e); musicNode = null; }
}
