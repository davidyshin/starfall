// Shared mutable runtime state and sprite registries.
const assets = { images: {}, sounds: {}, animations: {} };
const groups = {};
const sprites = {};
const touchControls = { left: false, right: false };
let touchMode = false;
let orientationPaused = false;
let guidePaused = false;
const state = {
  screen: SCREEN.START,
  paused: false,
  pausedAt: 0,
  muted: false,
  score: 0,
  highScore: 0,
  health: GAME.maxHealth,
  levelIndex: 0,
  explosionCreated: false,
  combo: 0,
  maxCombo: 0,
  specialCharge: 0,
  nextShotAt: 0,
  waveNoticeUntil: 0,
  shakeUntil: 0,
  flashUntil: 0,
  bossWaves: new Set(),
  powerUps: {
    overdriveCharges: GAME.maxOverdriveCharges,
    overdriveUntil: 0,
    nextOverdriveChargeAt: 0,
    slowTimeUntil: 0,
    shieldHits: 0,
  },
};
