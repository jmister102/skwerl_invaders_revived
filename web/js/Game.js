// Game.js — port of game.java
// State machine, game loop, rendering, input.

import { ImageExtractor } from './ImageLoader.js';
import { centerString, clearCanvas, Color, javaFont, getRandom } from './Utils.js';
import { GifButton } from './GifButton.js';
import { initFloater, Floater } from './Floater.js';
import { initExplosion, addExplosion, paintExplosions, updateExplosions } from './Explosion.js';
import * as Sound from './SoundManager.js';

// ── State constants (matching game.java) ─────────────────────────────────────
const STATE_LOADING      = 0;
const STATE_PAUSED       = 1;
const STATE_INTRO        = 2;
const STATE_INTRO2       = 3;
const STATE_WEAPONHELP   = 4;
const STATE_WEAPONS      = 5;
const STATE_MAINGAME     = 6;
const STATE_BOSS         = 7;
const STATE_ENDLEVEL     = 8;
const STATE_GAMEOVER     = 9;
const STATE_INTROMAIN    = 10;
const STATE_LOADING2     = 11;
const STATE_STARTING     = 12;
const STATE_DEAD         = 13;
const STATE_NEXTLEVEL    = 14;
const STATE_CHOOSEDIFF   = 15;
const STATE_CHOOSEHSLIST = 17;
const STATE_SHOWSCORES   = 18;
const STATE_GETPLAYERNAME= 19;

// Sprite sheet dimensions (from game.java constants)
const IMGSTRIPWIDTH    = 512;
const IMGSTRIPHEIGHT   = 896;
const ENEMYSTRIPWIDTH  = 256;
const ENEMYSTRIPHEIGHT = 896;
const BOSSIMGWIDTH     = 1312;
const BOSSIMGHEIGHT    = 640;

const FRAME_DELAY = 40;  // ms per tick (25 fps)

export class Game {
  constructor(canvas, ctx, images, soundBuffers, musicBuffers, audioCtx) {
    this.canvas  = canvas;
    this.ctx     = ctx;
    this.images  = images;       // HTMLImageElement keyed by name
    this.soundBuffers = soundBuffers;
    this.musicBuffers = musicBuffers;
    this.audioCtx = audioCtx;

    this.appWidth  = canvas.width;
    this.appHeight = canvas.height;

    // Double-buffer: off-screen canvas
    this.backCanvas = new OffscreenCanvas(this.appWidth, this.appHeight);
    this.db = this.backCanvas.getContext('2d');

    // Fonts (matching Java font objects)
    this.smallFont  = javaFont('Serif',     0, 12);
    this.medFont    = javaFont('Serif',     0, 14);
    this.largeFont  = javaFont('Serif',     0, 18);
    this.largeFont2 = javaFont('SansSerif', 1, 16);
    this.hugeFont   = javaFont('Dialog',    1, 20);

    this.gameState = STATE_LOADING;
    this.gameLevel = 1;
    this.globalMult = 1;
    this.diffChosen = false;
    this.difficulty = 1;
    this.bgMusicOn  = true;
    this.currentMusic = null;  // key string of active music

    // Background scroll
    this.backY = 0;
    this.backTileCanvas = null;  // pre-built scrolling backdrop

    // Buttons
    this.btnStart       = null;
    this.btnHighScores  = null;
    this.btnHelp        = null;
    this.btnOK          = null;
    this.btnEasy        = null;
    this.btnMedium      = null;
    this.btnHard        = null;

    // ImageExtractors
    this.imgExtractor = null;  // from spritestrip
    this.ieStrip      = null;  // from strip (tile bg)

    // Input state
    this.mouseX = 0;
    this.mouseY = 0;
    this.keys   = {};

    // Message overlay
    this.messageText  = '';
    this.messageDelay = 0;

    // HUD strings (pre-computed to avoid alloc in paint loop)
    this.cbText1 = '';
    this.cbText2 = '';

    // Sound system wired to our decoded buffers
    this._wireSounds();

    this._bindInput();
  }

  // ── Sound wiring ────────────────────────────────────────────────────────────
  _wireSounds() {
    // Inject decoded buffers into SoundManager's internal CLIPS array
    // We expose a simple set API on SoundManager for this purpose.
    for (const [id, buf] of Object.entries(this.soundBuffers)) {
      Sound._setClip(Number(id), buf);
    }
    Sound._setAudioCtx(this.audioCtx);
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  _bindInput() {
    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - r.left;
      this.mouseY = e.clientY - r.top;
      this._onMouseMove();
    });
    this.canvas.addEventListener('click', e => {
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      this._onMouseClick(x, y);
    });
    document.addEventListener('keydown', e => this._onKeyDown(e));
    document.addEventListener('keyup',   e => { this.keys[e.code] = false; });
  }

  _onMouseMove() {
    GifButton.resetHovering();
    this.canvas.style.cursor = 'default';
    for (const btn of this._activeButtons()) {
      btn.checkHover(this.mouseX, this.mouseY);
    }
    if (GifButton.getHovering()) this.canvas.style.cursor = 'pointer';
  }

  _onMouseClick(x, y) {
    Sound.unlockAudio();
    for (const btn of this._activeButtons()) {
      btn.checkClick(x, y);
    }
    this._processClicks();
  }

  _onKeyDown(e) {
    this.keys[e.code] = true;
    const k = e.key.toUpperCase();

    // S = toggle sounds, M = toggle music
    if (k === 'S' && this.gameState !== STATE_GETPLAYERNAME) {
      Sound.setSoundsOn(!Sound.isSoundsOn());
    }
    if (k === 'M' && this.gameState !== STATE_GETPLAYERNAME) {
      this.bgMusicOn = !this.bgMusicOn;
      if (!this.bgMusicOn) Sound.stopMusic();
      else this._chooseMusic();
    }

    // Hot-key buttons
    for (const btn of this._activeButtons()) {
      btn.checkKey(e.key);
    }
    this._processClicks();
  }

  _activeButtons() {
    switch (this.gameState) {
      case STATE_INTRO:
      case STATE_INTRO2:
        return [this.btnStart, this.btnHighScores, this.btnHelp].filter(Boolean);
      case STATE_INTROMAIN:
        return [this.btnStart, this.btnHighScores, this.btnHelp].filter(Boolean);
      case STATE_CHOOSEDIFF:
        return [this.btnEasy, this.btnMedium, this.btnHard].filter(Boolean);
      case STATE_WEAPONHELP:
        return [this.btnOK].filter(Boolean);
      default:
        return [];
    }
  }

  _processClicks() {
    if (this.btnStart?.clicked) {
      this.btnStart.clicked = false;
      this._goChooseDiff();
    }
    if (this.btnHighScores?.clicked) {
      this.btnHighScores.clicked = false;
      this._goHighScores();
    }
    if (this.btnHelp?.clicked) {
      this.btnHelp.clicked = false;
      window.open('https://nerdbucket.com/games/invaders/help.php', '_blank');
    }
    if (this.btnEasy?.clicked) {
      this.btnEasy.clicked = false; this.difficulty = 1; this.diffChosen = true;
    }
    if (this.btnMedium?.clicked) {
      this.btnMedium.clicked = false; this.difficulty = 2; this.diffChosen = true;
    }
    if (this.btnHard?.clicked) {
      this.btnHard.clicked = false; this.difficulty = 3; this.diffChosen = true;
    }
    if (this.btnOK?.clicked) {
      this.btnOK.clicked = false;
      this.gameState = STATE_WEAPONS;
    }
  }

  // ── Boot / asset setup ───────────────────────────────────────────────────────
  start() {
    // Build sprite extractor from spritestrip.gif (512×896)
    this.imgExtractor = new ImageExtractor(this.images.spritestrip, IMGSTRIPWIDTH, IMGSTRIPHEIGHT);

    // Build strip extractor for background tiles (strip.gif is 512×896)
    this.ieStrip = new ImageExtractor(this.images.strip, IMGSTRIPWIDTH, IMGSTRIPHEIGHT);

    // Build tiled background canvas
    this._buildBackdrop();

    // Setup explosions from spritestrip row 128
    initExplosion(this.imgExtractor, 10);

    // Floater colors/font
    initFloater('#ffff00', this.smallFont);

    // Build intro screen buttons
    this._buildIntroButtons();

    // Start intro music
    this._startMusic('intro');

    // Transition to intro
    this.gameState = STATE_INTRO;

    // Kick off game loop
    this._lastTime = performance.now();
    requestAnimationFrame(ts => this._loop(ts));
  }

  _buildBackdrop() {
    // The tiled backdrop is built from the strip image.
    // For simplicity, render backdrop2 image directly (scrolled vertically).
    // Full TileGameObj port will replace this.
    this.backdropImg = this.images.backdrop2;
  }

  _buildIntroButtons() {
    const cx = this.appWidth;
    const w1 = 120, h1 = 20, bx = (cx - w1) / 2;

    this.btnStart = GifButton.text(bx, 310, w1, h1,
      this.largeFont2, Color.blue, Color.red, 'Begin');
    this.btnStart.setHotKey('B');
    this.btnStart.enable();

    this.btnHighScores = GifButton.text(bx, 340, w1, h1,
      this.largeFont2, Color.blue, Color.red, 'High Scores');
    this.btnHighScores.setHotKey('H');
    this.btnHighScores.enable();

    this.btnHelp = GifButton.text(bx, 370, w1, h1,
      this.largeFont2, Color.blue, Color.red, 'Help');
    this.btnHelp.setHotKey('?');
    this.btnHelp.enable();
  }

  _buildDiffButtons() {
    const cx = this.appWidth;
    const h = 20;
    const make = (label, y, key) => {
      const w = label.length * 10 + 20;
      const b = GifButton.text((cx - w) / 2, y, w, h,
        this.largeFont2, Color.blue, Color.red, label);
      b.setHotKey(key);
      b.enable();
      return b;
    };
    this.btnEasy   = make('Easy (1)',   100, '1');
    this.btnMedium = make('Medium (2)', 120, '2');
    this.btnHard   = make('Hard (3)',   140, '3');
  }

  // ── Music ───────────────────────────────────────────────────────────────────
  _startMusic(key) {
    if (!this.bgMusicOn || this.currentMusic === key) return;
    Sound.stopMusic();
    const buf = this.musicBuffers[key];
    if (!buf) return;
    Sound._playMusic(buf, this.audioCtx);
    this.currentMusic = key;
  }

  _chooseMusic() {
    if ([STATE_LOADING, STATE_INTRO, STATE_INTRO2, STATE_LOADING2].includes(this.gameState)) {
      this._startMusic('intro');
    } else if (this.gameLevel % 5 === 0) {
      this._startMusic('boss');
    } else {
      this._startMusic('theme');
    }
  }

  // ── Navigation helpers ───────────────────────────────────────────────────────
  _goChooseDiff() {
    this._buildDiffButtons();
    this.diffChosen = false;
    this.gameState = STATE_CHOOSEDIFF;
  }

  _goHighScores() {
    // TODO: fetch leaderboard
    this.gameState = STATE_SHOWSCORES;
  }

  // ── Game loop ────────────────────────────────────────────────────────────────
  _loop(timestamp) {
    const dt = timestamp - this._lastTime;
    if (dt >= FRAME_DELAY) {
      this._lastTime = timestamp - (dt % FRAME_DELAY);
      this._update();
      this._paint();
    }
    requestAnimationFrame(ts => this._loop(ts));
  }

  // ── Update ───────────────────────────────────────────────────────────────────
  _update() {
    // Scroll background
    this.backY = (this.backY + 1) % (this.appHeight);

    switch (this.gameState) {
      case STATE_CHOOSEDIFF:
        if (this.diffChosen) this._startGame();
        break;
      case STATE_MAINGAME:
      case STATE_BOSS:
        this._updateGame();
        break;
      case STATE_SHOWSCORES:
        // back to intro on any key
        if (Object.values(this.keys).some(Boolean)) {
          this.keys = {};
          this.gameState = STATE_INTRO;
        }
        break;
    }
  }

  _updateGame() {
    // TODO: update player, enemies, missiles, explosions, shields
    updateExplosions();
  }

  // ── Paint ────────────────────────────────────────────────────────────────────
  _paint() {
    const g = this.db;
    g.clearRect(0, 0, this.appWidth, this.appHeight);

    switch (this.gameState) {
      case STATE_INTRO:
      case STATE_INTRO2:
      case STATE_INTROMAIN:
        this._drawIntroPage(g);
        break;
      case STATE_CHOOSEDIFF:
        this._drawChooseDiff(g);
        break;
      case STATE_MAINGAME:
      case STATE_BOSS:
        this._drawMainGame(g);
        break;
      case STATE_SHOWSCORES:
        this._drawScores(g);
        break;
      default:
        clearCanvas(g, Color.black, this.appWidth, this.appHeight);
        this._drawBottom(g);
    }

    // Blit double-buffer to screen
    this.ctx.drawImage(this.backCanvas, 0, 0);
  }

  _drawScrollingBack(g) {
    const img = this.backdropImg;
    if (!img) return;
    const ih = img.height || this.appHeight;
    const iw = img.width  || this.appWidth;
    // Tile vertically
    const y0 = this.backY % ih;
    g.drawImage(img, 0, y0 - ih, iw, ih);
    g.drawImage(img, 0, y0,      iw, ih);
  }

  _drawIntroPage(g) {
    this._drawScrollingBack(g);
    this._drawBottom(g);

    // Title / copyright
    centerString(g, Color.white,
      'Squirrel Invaders, Copyright \u00A9 2000 by Jeremy Echols',
      this.largeFont, this.appWidth, 60);

    // Story text
    g.font = this.medFont;
    g.fillStyle = Color.yellow;
    const lines = [
      'It was a time of chaos, a time of war.  Acorn and nut reserves were depleted',
      'all over the galaxy.  Earthlings were forced to fight hordes of rabid extra-',
      'terrestrial squirrels in order to preserve their own rations.  Rappy, once a',
      'kind and generous squirrel, was unable to control his need for good acorns.',
      'Rappy assembled an army of squirrels and other beasts to fight back against the',
      'earthlings.  With his friends and their deadly arsenal of unripe green acorns,',
      'they were unstoppable.  Rumors tore apart nations.  Governments allied with the',
      'squirrels and began secret projects to create evil squirrel-human hybrids.  These',
      'unspeakable events brought you to investigate.',
      'After discovering the horrifying truth of the situation you\'ve realized that you,',
      'and ONLY you, will be able to destroy the alien squirrels and reclaim earth...',
    ];
    lines.forEach((line, i) => {
      const w = g.measureText(line).width;
      g.fillText(line, (this.appWidth - w) / 2, 90 + i * 20);
    });

    // Buttons
    this.btnStart?.paint(g);
    this.btnHighScores?.paint(g);
    this.btnHelp?.paint(g);
  }

  _drawChooseDiff(g) {
    this._drawScrollingBack(g);
    this._drawBottom(g);
    centerString(g, Color.white, 'Choose Difficulty', this.hugeFont, this.appWidth, 70);
    this.btnEasy?.paint(g);
    this.btnMedium?.paint(g);
    this.btnHard?.paint(g);
  }

  _drawMainGame(g) {
    this._drawScrollingBack(g);
    this._drawBottom(g);
    paintExplosions(g);
    // TODO: player, enemies, missiles, shields, floaters
  }

  _drawScores(g) {
    clearCanvas(g, Color.black, this.appWidth, this.appHeight);
    centerString(g, Color.white, 'High Scores — Coming Soon', this.largeFont, this.appWidth, this.appHeight / 2);
    centerString(g, Color.gray, 'Press any key to return', this.medFont, this.appWidth, this.appHeight / 2 + 30);
  }

  _drawBottom(g) {
    // HUD bar at bottom (matching ClearBottom in Java)
    g.fillStyle = Color.black;
    g.fillRect(0, this.appHeight - 20, this.appWidth, 20);
    g.strokeStyle = Color.gray;
    g.strokeRect(0, this.appHeight - 20, this.appWidth - 1, 19);

    g.font = this.largeFont2;
    if (this.gameState === STATE_MAINGAME || this.gameState === STATE_WEAPONS) {
      g.fillStyle = Color.green;
      const scoreText = `Score: ${this.currentPlayer?.totalPoints ?? 0}`;
      g.fillText(scoreText, 10, this.appHeight - 4);
      const levelText = `Level: ${this.gameLevel}`;
      const lw = g.measureText(levelText).width;
      g.fillText(levelText, this.appWidth - 10 - lw, this.appHeight - 4);
    } else if (this.gameState === STATE_LOADING || this.gameState === STATE_LOADING2) {
      g.fillStyle = Color.red;
      centerString(g, Color.red, 'Please Wait...', this.largeFont2, this.appWidth, this.appHeight - 4);
    } else if (this.gameState === STATE_INTRO || this.gameState === STATE_INTRO2) {
      centerString(g, Color.white, "[S]ound  [M]usic  [B]egin  [H]igh Scores", this.largeFont2, this.appWidth, this.appHeight - 4);
    } else if (this.gameState === STATE_CHOOSEDIFF) {
      g.fillStyle = Color.blue;
      centerString(g, Color.blue, 'Choose a difficulty level to continue', this.largeFont2, this.appWidth, this.appHeight - 4);
    } else if (this.gameState === STATE_INTROMAIN) {
      centerString(g, Color.white, "Click 'Begin' to start a game", this.largeFont2, this.appWidth, this.appHeight - 4);
    }
  }

  // TODO: _startGame, _updateGame full implementations
  _startGame() {
    this.gameLevel  = 1;
    this.globalMult = 1;
    this.messageDelay = 0;
    this.gameState = STATE_MAINGAME;
    this._chooseMusic();
    // Full entity init will go here
  }
}
