/* global Group, LEFT, CENTER, BOLD, NORMAL, PI, TWO_PI */

const CANVAS = Object.freeze({ width: 800, height: 600 });
const VERSION = "1.1.11";
const SCREEN = Object.freeze({
  START: "start",
  PLAYING: "playing",
  GAME_OVER: "game-over",
});
const STORAGE_KEYS = Object.freeze({ highScore: "starfall.highScore" });
const CONTROL_KEY_CODES = new Set([32, 37, 39, 70, 77, 80, 88, 90]);
const GAME = Object.freeze({
  frameRate: 40,
  maxHealth: 100,
  baseStarCount: 18,
  maxStarCount: 28,
  maxRedStars: 3,
  shipMinX: 50,
  shipMaxX: 750,
  shipAcceleration: 3.5,
  shipMaxSpeed: 18,
  shipDrag: 0.55,
  starSpawnMinY: -1400,
  starSpawnMaxY: -60,
  maxSpecialCharge: 100,
  specialChargePerStar: 2,
  specialChargePerBoss: 35,
  specialWidth: 330,
  specialBossDamage: 12,
  shotCooldownMs: 190,
  overdriveShotCooldownMs: 80,
  maxOverdriveCharges: 3,
  overdriveBurstDurationMs: 12000,
  overdriveRechargeMs: 35000,
  powerUpDurationMs: 12000,
  powerUpDropChance: 0.09,
  powerUpSize: 46,
  bossWaveInterval: 5,
  bossBurstDurationMs: 1800,
  bossBurstCooldownMs: 7500,
  bossBurstShotCooldownMs: 520,
});
const LEVELS = Object.freeze([
  { score: 0, gravity: 2 },
  { score: 50, gravity: 2.5 },
  { score: 130, gravity: 3.1 },
  { score: 260, gravity: 3.8 },
  { score: 450, gravity: 4.5 },
  { score: 700, gravity: 5.2 },
  { score: 1000, gravity: 5.9 },
  { score: 1400, gravity: 6.6 },
  { score: 1900, gravity: 7.3 },
  { score: 2500, gravity: 8 },
  { score: 3200, gravity: 8.7 },
  { score: 4000, gravity: 9.4 },
  { score: 5000, gravity: 10.1 },
  { score: 6200, gravity: 10.8 },
  { score: 7600, gravity: 11.5 },
]);
const ENDLESS = Object.freeze({
  scoreStep: 1800,
  scoreStepGrowth: 200,
  gravityStep: 0.45,
  maxGravity: 14,
});
