// main.js — entry point, asset loading, kicks off Game
import { loadImages } from './ImageLoader.js';
import { loadSounds, unlockAudio,
         LASER01, ROCKET01, FIRE01, ENEMYROCK, ENEMYLASER, ENEMYFIRE,
         EXPLOSION, ENDGAME, TAUNT01 } from './SoundManager.js';
import { Game } from './Game.js';

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// Unlock Web Audio on first click/keypress
document.addEventListener('keydown',    unlockAudio, { once: true });
document.addEventListener('pointerdown', unlockAudio, { once: true });

// ── Loading screen ────────────────────────────────────────────────────────────
function drawLoading(text) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = '16px monospace';
  const w = ctx.measureText(text).width;
  ctx.fillText(text, (canvas.width - w) / 2, canvas.height / 2);
}

// ── Asset manifests ───────────────────────────────────────────────────────────
const IMAGE_URLS = {
  strip:       'assets/strip.gif',
  buttons:     'assets/buttons.gif',
  buttons2:    'assets/buttons2.gif',
  spritestrip: 'assets/spritestrip.gif',
  enemystrip0: 'assets/enemystrip0.gif',
  enemystrip1: 'assets/enemystrip1.gif',
  backdrop2:   'assets/backdrop2.gif',
  backdrop3:   'assets/backdrop3.gif',
  enemyboss1:  'assets/enemyboss1.gif',
  rappy:       'assets/rappy.gif',
  weaponstrip: 'assets/weaponstrip.gif',
};

// Sound id → wav file mapping (matches SoundMan constants)
const SOUND_URLS = {
  [LASER01]:    'assets/laser1.wav',
  [ROCKET01]:   'assets/rocket1.wav',
  [FIRE01]:     'assets/fire1.wav',
  [ENEMYROCK]:  'assets/enemyrock.wav',
  [ENEMYLASER]: 'assets/enemylaser.wav',
  [ENEMYFIRE]:  'assets/fire1.wav',
  [EXPLOSION]:  'assets/explosion.wav',
  [ENDGAME]:    'assets/invaderremix.wav',
  [TAUNT01]:    'assets/weregonnagetyou.wav',
  1:            'assets/imgonnagetyou.wav',   // TAUNT02
};

// Music tracks loaded separately (large files, streamed via SoundManager)
const MUSIC_URLS = {
  intro:  'assets/intro.wav',
  theme:  'assets/theme.wav',
  boss:   'assets/boss.wav',
  endgame:'assets/invaderremix.wav',
};

// ── Boot sequence ─────────────────────────────────────────────────────────────
async function boot() {
  const total = Object.keys(IMAGE_URLS).length + Object.keys(SOUND_URLS).length
              + Object.keys(MUSIC_URLS).length;
  let loaded = 0;

  function progress(label) {
    loaded++;
    drawLoading(`Loading... ${label} (${loaded}/${total})`);
  }

  drawLoading('Loading...');

  // Load images
  const imgPromises = Object.entries(IMAGE_URLS).map(([key, url]) =>
    new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { progress(url); resolve([key, img]); };
      img.onerror = () => { console.warn(`Failed: ${url}`); progress(url); resolve([key, null]); };
      img.src = url;
    })
  );

  // Load sounds (async, parallel with images)
  const soundEntries = Object.entries(SOUND_URLS);
  const soundPromises = soundEntries.map(async ([id, url]) => {
    try {
      const res = await fetch(url);
      const ab  = await res.arrayBuffer();
      progress(url);
      return [id, ab];
    } catch (e) {
      console.warn(`Sound failed: ${url}`); progress(url);
      return [id, null];
    }
  });

  const musicEntries = Object.entries(MUSIC_URLS);
  const musicPromises = musicEntries.map(async ([key, url]) => {
    try {
      const res = await fetch(url);
      const ab  = await res.arrayBuffer();
      progress(url);
      return [key, ab];
    } catch (e) {
      console.warn(`Music failed: ${url}`); progress(url);
      return [key, null];
    }
  });

  const [imgPairs, soundPairs, musicPairs] = await Promise.all([
    Promise.all(imgPromises),
    Promise.all(soundPromises),
    Promise.all(musicPromises),
  ]);

  const images    = Object.fromEntries(imgPairs);
  const soundABs  = Object.fromEntries(soundPairs);
  const musicABs  = Object.fromEntries(musicPairs);

  // Decode audio buffers
  const { AudioContext, webkitAudioContext } = window;
  const ac = new (AudioContext || webkitAudioContext)();
  const soundBuffers = {};
  for (const [id, ab] of Object.entries(soundABs)) {
    if (ab) try { soundBuffers[id] = await ac.decodeAudioData(ab.slice(0)); } catch (_) {}
  }
  const musicBuffers = {};
  for (const [key, ab] of Object.entries(musicABs)) {
    if (ab) try { musicBuffers[key] = await ac.decodeAudioData(ab.slice(0)); } catch (_) {}
  }

  drawLoading('Starting game...');

  // Hand off to Game
  const game = new Game(canvas, ctx, images, soundBuffers, musicBuffers, ac);
  game.start();
}

boot().catch(err => {
  console.error('Boot failed:', err);
  ctx.fillStyle = '#fff';
  ctx.font = '14px monospace';
  ctx.fillText('Boot error — see console', 20, 40);
});
