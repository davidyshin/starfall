/* global Group, LEFT, CENTER, BOLD, NORMAL, PI, TWO_PI */

const CANVAS = Object.freeze({ width: 800, height: 600 });
const VERSION = "1.1.5";
const SCREEN = Object.freeze({
  START: "start",
  PLAYING: "playing",
  GAME_OVER: "game-over",
});
const STORAGE_KEYS = Object.freeze({ highScore: "starfall.highScore" });
const CONTROL_KEY_CODES = new Set([32, 37, 39, 77, 80, 90]);
const GAME = Object.freeze({
  frameRate: 40,
  maxHealth: 100,
  baseStarCount: 16,
  maxStarCount: 24,
  shipMinX: 50,
  shipMaxX: 750,
  shipAcceleration: 3.5,
  shipMaxSpeed: 18,
  shipDrag: 0.55,
  starSpawnMinY: -1400,
  starSpawnMaxY: -60,
  maxSpecialCharge: 100,
  shotCooldownMs: 220,
  rapidShotCooldownMs: 80,
  powerUpDurationMs: 12000,
  powerUpDropChance: 0.14,
  powerUpSize: 38,
  bossWaveInterval: 5,
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
    rapidFireUntil: 0,
    spreadShotUntil: 0,
    slowTimeUntil: 0,
    shieldHits: 0,
  },
};

function preload() {
  assets.font = loadFont("assets/fonts/2p.ttf");
  assets.images.ship = loadImage("assets/images/ship.png");
  assets.images.heart = loadImage("assets/images/heart.png");
  assets.images.bullet = loadImage("assets/images/bullet.png");
  assets.images.background = loadImage("assets/images/background.png");
  assets.images.startBackground = loadImage("assets/images/startbg.png");
  assets.images.boss = loadImage("assets/opengameart/boss/BlueBoss_1.png");
  assets.images.bossLaser = loadImage(
    "assets/opengameart/projectiles/boss-laser.png"
  );
  assets.images.powerUps = {
    rapidFire: loadImage("assets/opengameart/powerups/rapid-fire.png"),
    spreadShot: loadImage("assets/opengameart/powerups/spread-shot.png"),
    slowTime: loadImage("assets/opengameart/powerups/slow-time.png"),
    shield: loadImage("assets/opengameart/powerups/shield.png"),
  };
  assets.images.particles = [
    loadImage("assets/images/particle.png"),
    loadImage("assets/images/particle2.png"),
    loadImage("assets/images/particle3.png"),
  ];
  assets.animations.explosion = loadAnimation(
    "assets/explode/explosion_00.png",
    "assets/explode/explosion_35.png"
  );
  assets.animations.yellowStar = loadAnimation(
    "assets/star-two/star_01.png",
    "assets/star-two/star_06.png"
  );
  assets.animations.blueStar = loadAnimation(
    "assets/star/star_10.png",
    "assets/star/star_14.png"
  );
  assets.animations.greenStar = loadAnimation(
    "assets/star/star_16.png",
    "assets/star/star_21.png"
  );
  assets.animations.redStar = loadAnimation(
    "assets/star/star_22.png",
    "assets/star/star_27.png"
  );

  soundFormats("wav", "ogg");
  assets.sounds = {
    start: loadSound("assets/sounds/start.wav"),
    gameOver: loadSound("assets/sounds/gameover.wav"),
    bullet: loadSound("assets/sounds/laser.wav"),
    starHit: loadSound("assets/sounds/starhit.wav"),
    baseHit: loadSound("assets/sounds/basehit.wav"),
    life: loadSound("assets/sounds/life.wav"),
    special: loadSound("assets/sounds/special.wav"),
    pause: loadSound("assets/sounds/pause.wav"),
    gameOverMusic: loadSound("assets/sounds/gameoverbgm.ogg"),
    menuMusic: loadSound("assets/sounds/startmenu.wav"),
    gameMusic: loadSound("assets/sounds/bgm.ogg"),
  };
}

function setup() {
  const canvas = createCanvas(CANVAS.width, CANVAS.height);
  canvas.parent(document.querySelector("main"));
  frameRate(GAME.frameRate);
  textFont(assets.font);
  masterVolume(0.05);
  state.highScore = loadHighScore();

  // These source images are 318px square. Drawing and rotating them at 12%
  // scale made the canvas resample every power-up on every frame.
  Object.keys(assets.images.powerUps).forEach((key) => {
    assets.images.powerUps[key].resize(GAME.powerUpSize, GAME.powerUpSize);
  });

  groups.stars = new Group();
  groups.bullets = new Group();
  groups.explosions = new Group();
  groups.hearts = new Group();
  groups.specials = new Group();
  groups.particles = new Group();
  groups.powerUps = new Group();
  groups.bosses = new Group();
  groups.enemyBullets = new Group();

  sprites.ship = createSprite(width / 2, height * 0.93, 20, 20);
  sprites.ship.addImage(assets.images.ship);
  sprites.ship.setCollider("rectangle", 0, 2, 42, 28);
  sprites.base = createSprite(width / 2, height * 0.985, width, 20);
  sprites.base.setCollider("rectangle", 0, 0, width, 20);
  sprites.healthBar = createSprite(width / 2, height * 0.013, width, 20);
  sprites.base.shapeColor = color(0);
  updateHealthBar();
  assets.sounds.menuMusic.setLoop(true);
  assets.sounds.gameMusic.setLoop(true);
  assets.sounds.gameOverMusic.setLoop(true);
  assets.sounds.menuMusic.loop();
  touchMode =
    navigator.maxTouchPoints > 0 ||
    "ontouchstart" in window ||
    window.matchMedia("(pointer: coarse)").matches;
  document.documentElement.classList.toggle("touch-device", touchMode);
  bindTouchControls(canvas.elt);
  bindGuideModal();
  bindOrientationHandling();
}

function draw() {
  updateExternalUi();
  if (state.screen === SCREEN.START) {
    drawStartScreen();
    return;
  }
  if (state.screen === SCREEN.GAME_OVER) {
    drawGameOverScreen();
    return;
  }
  if (state.paused) {
    drawGame();
    drawPauseOverlay();
    return;
  }
  updateGame();
  drawGame();
}

function drawStartScreen() {
  background(assets.images.startBackground);
  setTextStyle(20);
  text("Welcome to Starfall.", width / 2, height / 2.5);
  text("Protect your city\nfrom the falling stars.", width / 2, height / 2.1);
  drawBlinkingText('Press "Space" or click to start.', height / 1.7);

  if (keyWentDown("space") || mouseWentDown(LEFT)) startGame();
}

function startGame() {
  assets.sounds.start.play();
  assets.sounds.menuMusic.stop();
  assets.sounds.gameMusic.loop();
  state.screen = SCREEN.PLAYING;
  state.waveNoticeUntil = millis() + 1800;
}

function updateGame() {
  while (groups.bosses.length === 0 && groups.stars.length < targetStarCount()) {
    createStar();
  }

  updateShip();
  updateStars();
  updateBosses();
  removeOffscreenPlayerShots();
  if ((keyDown("space") || touchMode) && millis() >= state.nextShotAt) {
    shoot();
  }
  if (keyWentDown("z")) useSpecial();

  groups.bullets.overlap(groups.stars, bulletHitStar);
  groups.bullets.overlap(groups.bosses, bulletHitBoss);
  groups.stars.overlap(sprites.base, starHitBase);
  groups.hearts.overlap(sprites.ship, collectHeart);
  groups.powerUps.overlap(sprites.ship, collectPowerUp);
  groups.enemyBullets.overlap(sprites.ship, enemyBulletHitShip);
  groups.specials.overlap(groups.stars, specialHitStar);
  groups.specials.overlap(groups.bosses, specialHitBoss);
  updateLevel();
  updateHighScore();
}

function updateHighScore() {
  if (state.score <= state.highScore) return;
  state.highScore = state.score;
  saveHighScore(state.highScore);
}

function targetStarCount() {
  return Math.min(
    GAME.maxStarCount,
    GAME.baseStarCount + Math.floor(state.levelIndex / 2)
  );
}

function drawGame() {
  background(assets.images.background);
  push();
  if (millis() < state.shakeUntil) translate(random(-7, 7), random(-5, 5));
  drawSprites();
  pop();
  drawShieldIndicator();
  drawHud();
  drawWaveAnnouncement();
  if (millis() < state.flashUntil) {
    noStroke();
    fill(255, 80);
    rect(0, 0, width, height);
  }
}

function drawHud() {
  setTextStyle(15, BOLD);
  text(`Starfall v${VERSION}`, width / 2, 45);
  setTextStyle(10, NORMAL);
  text(`CITY HP: ${state.health}`, width / 2, 65);
  text(`Score: ${state.score}`, 730, 55);
  text(`Hi-Score: ${state.highScore}`, 730, 70);
  text(`Level: ${state.levelIndex + 1}`, 70, 55);
  text(`Combo: x${comboMultiplier()} (${state.combo})`, 110, 70);
  text(`Special: ${Math.floor(state.specialCharge)}%`, 110, 85);
}

function updateShip() {
  const movingLeft = keyDown("left") || touchControls.left;
  const movingRight = keyDown("right") || touchControls.right;
  const direction = Number(movingRight) - Number(movingLeft);

  if (direction !== 0) {
    sprites.ship.velocity.x = constrain(
      sprites.ship.velocity.x + direction * GAME.shipAcceleration,
      -GAME.shipMaxSpeed,
      GAME.shipMaxSpeed
    );
  } else {
    sprites.ship.velocity.x *= GAME.shipDrag;
    if (abs(sprites.ship.velocity.x) < 0.1) sprites.ship.velocity.x = 0;
  }

  sprites.ship.position.x = constrain(
    sprites.ship.position.x,
    GAME.shipMinX,
    GAME.shipMaxX
  );

  const atLeftEdge = sprites.ship.position.x <= GAME.shipMinX;
  const atRightEdge = sprites.ship.position.x >= GAME.shipMaxX;
  if (
    (atLeftEdge && sprites.ship.velocity.x < 0) ||
    (atRightEdge && sprites.ship.velocity.x > 0)
  ) {
    sprites.ship.velocity.x = 0;
  }
}

function shoot() {
  const spreadActive = millis() < state.powerUps.spreadShotUntil;
  const angles = spreadActive ? [255, 270, 285] : [270];
  angles.forEach((angle) => createBullet(angle));
  state.nextShotAt =
    millis() +
    (millis() < state.powerUps.rapidFireUntil
      ? GAME.rapidShotCooldownMs
      : GAME.shotCooldownMs);
  assets.sounds.bullet.setVolume(0.3);
  assets.sounds.bullet.play();
}

function createBullet(angle) {
  const bullet = createSprite(
    sprites.ship.position.x,
    sprites.ship.position.y - 10,
    8,
    18
  );
  bullet.addImage(assets.images.bullet);
  bullet.setCollider("rectangle", 0, 0, 7, 17);
  bullet.setSpeed(10, angle);
  bullet.life = 70;
  groups.bullets.add(bullet);
}

function removeOffscreenPlayerShots() {
  removeSpritesAboveCanvas(groups.bullets);
  removeSpritesAboveCanvas(groups.specials);
}

function removeSpritesAboveCanvas(group) {
  for (let index = group.length - 1; index >= 0; index -= 1) {
    if (group[index].position.y < 0) group[index].remove();
  }
}

function useSpecial() {
  if (state.specialCharge < GAME.maxSpecialCharge) return;
  const special = createSprite(width / 2, sprites.ship.position.y, width, 1.5);
  special.setCollider("rectangle", 0, 0, width, 4);
  special.setSpeed(9, 270);
  special.life = 70;
  groups.specials.add(special);
  assets.sounds.special.play();
  state.specialCharge = 0;
}

function createStar() {
  const star = createSprite(
    random(GAME.shipMinX, GAME.shipMaxX),
    random(GAME.starSpawnMinY, GAME.starSpawnMaxY),
    50,
    50
  );
  const type = chooseStarType();
  star.starType = type.name;
  star.health = type.health;
  star.points = type.points;
  star.baseSpeed = getLevelConfig(state.levelIndex).gravity * type.speedMultiplier;
  star.addAnimation(type.name, assets.animations[type.animation]);
  star.setCollider("circle", 0, 0, 21);
  star.setSpeed(star.baseSpeed, 90);
  star.rotationSpeed = 2.5;
  groups.stars.add(star);
}

function chooseStarType() {
  const roll = random();
  if (state.levelIndex >= 7 && roll < 0.12) {
    return {
      name: "red",
      animation: "redStar",
      health: 2,
      points: 5,
      speedMultiplier: 1.1,
    };
  }
  if (state.levelIndex >= 4 && roll < 0.28) {
    return {
      name: "green",
      animation: "greenStar",
      health: 3,
      points: 4,
      speedMultiplier: 0.72,
    };
  }
  if (state.levelIndex >= 1 && roll < 0.48) {
    return {
      name: "blue",
      animation: "blueStar",
      health: 1,
      points: 2,
      speedMultiplier: 1.55,
    };
  }
  return {
    name: "yellow",
    animation: "yellowStar",
    health: 1,
    points: 1,
    speedMultiplier: 1,
  };
}

function updateStars() {
  const slowed = millis() < state.powerUps.slowTimeUntil;
  groups.stars.forEach((star) => {
    star.setSpeed(star.baseSpeed * (slowed ? 0.55 : 1), 90);
    if (star.starType === "red") {
      star.position.x = constrain(
        star.position.x + Math.sin(frameCount * 0.12) * 2.5,
        GAME.shipMinX,
        GAME.shipMaxX
      );
    }
  });
}

function createHeart() {
  if (groups.hearts.length > 0) return;
  const heart = createSprite(
    random(GAME.shipMinX, GAME.shipMaxX),
    -200,
    20,
    20
  );
  heart.addImage(assets.images.heart);
  heart.setCollider("circle", 0, 0, 14);
  heart.setSpeed(10, 90);
  heart.life = 90;
  groups.hearts.add(heart);
}

function collectHeart(heart) {
  state.health = GAME.maxHealth;
  updateHealthBar();
  assets.sounds.life.play();
  heart.remove();
}

function starHitBase(star) {
  if (state.powerUps.shieldHits > 0) {
    state.powerUps.shieldHits -= 1;
  } else {
    state.health = Math.max(0, state.health - 8);
  }
  state.combo = 0;
  updateHealthBar();
  assets.sounds.baseHit.play();
  createParticles(star.position.x, star.position.y + 20, 35, true);
  triggerImpactEffects();
  star.remove();
  if (state.health === 0) endGame();
}

function bulletHitStar(bullet, star) {
  if (bullet.removed || star.removed || star.destroyed) return;
  bullet.remove();
  star.health -= 1;
  if (star.health <= 0) destroyStar(star, true);
  else createParticles(star.position.x, star.position.y, 5, false);
}

function specialHitStar(_special, star) {
  if (star.removed || star.destroyed) return;
  destroyStar(star, false);
}

function destroyStar(star, awardsSpecialCharge) {
  if (star.removed || star.destroyed) return;
  star.destroyed = true;
  const x = star.position.x;
  const y = star.position.y;
  const points = star.points || 1;
  createParticles(star.position.x, star.position.y, 15, false);
  star.remove();
  assets.sounds.starHit.play();
  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.score += points * comboMultiplier();
  if (awardsSpecialCharge) {
    state.specialCharge = Math.min(
      GAME.maxSpecialCharge,
      state.specialCharge + points * 5
    );
  }
  if (random() < GAME.powerUpDropChance) createPowerUp(x, y);
}

function comboMultiplier() {
  return Math.min(5, 1 + Math.floor(state.combo / 10));
}

function createPowerUp(x, y) {
  if (groups.powerUps.length >= 3) return;
  const types = [
    { name: "Rapid Fire", image: assets.images.powerUps.rapidFire },
    { name: "Spread Shot", image: assets.images.powerUps.spreadShot },
    { name: "Slow Time", image: assets.images.powerUps.slowTime },
    { name: "Shield", image: assets.images.powerUps.shield },
  ];
  const typeIndex = Math.floor(random(types.length));
  const type = types[typeIndex];
  const powerUp = createSprite(x, y, 24, 24);
  powerUp.powerUpType = type.name;
  powerUp.addImage(type.image);
  powerUp.setCollider("circle", 0, 0, GAME.powerUpSize * 0.44);
  powerUp.rotationSpeed = 4;
  const fallSpeed = 3;
  powerUp.setSpeed(fallSpeed, 90);
  powerUp.life = Math.ceil((height - y + 100) / fallSpeed);
  groups.powerUps.add(powerUp);
}

function collectPowerUp(powerUp) {
  const expiresAt = millis() + GAME.powerUpDurationMs;
  if (powerUp.powerUpType === "Rapid Fire") state.powerUps.rapidFireUntil = expiresAt;
  if (powerUp.powerUpType === "Spread Shot") state.powerUps.spreadShotUntil = expiresAt;
  if (powerUp.powerUpType === "Slow Time") state.powerUps.slowTimeUntil = expiresAt;
  if (powerUp.powerUpType === "Shield") state.powerUps.shieldHits += 3;
  assets.sounds.life.play();
  powerUp.remove();
}

function getActivePowerUpNames() {
  const names = [];
  if (millis() < state.powerUps.rapidFireUntil) {
    names.push(`RAPID FIRE ${secondsRemaining(state.powerUps.rapidFireUntil)}s`);
  }
  if (millis() < state.powerUps.spreadShotUntil) {
    names.push(`SPREAD SHOT ${secondsRemaining(state.powerUps.spreadShotUntil)}s`);
  }
  if (millis() < state.powerUps.slowTimeUntil) {
    names.push(`SLOW TIME ${secondsRemaining(state.powerUps.slowTimeUntil)}s`);
  }
  if (state.powerUps.shieldHits > 0) names.push(`SHIELD ${state.powerUps.shieldHits}`);
  return names;
}

function secondsRemaining(expiresAt) {
  return Math.max(1, Math.ceil((expiresAt - millis()) / 1000));
}

function drawShieldIndicator() {
  if (state.powerUps.shieldHits <= 0) return;
  push();
  noFill();
  stroke(70, 255, 190, 210);
  strokeWeight(4);
  arc(width / 2, height - 2, width - 10, 100, PI, TWO_PI);
  noStroke();
  setTextStyle(9, BOLD);
  fill(70, 255, 190);
  text(`SHIELD × ${state.powerUps.shieldHits}`, width / 2, height - 34);
  pop();
}

function triggerImpactEffects() {
  state.shakeUntil = millis() + 280;
  state.flashUntil = millis() + 120;
}

function createParticles(x, y, count, useAllColors) {
  for (let index = 0; index < count; index += 1) {
    const particle = createSprite(x, y);
    const imageCount = useAllColors ? assets.images.particles.length : 2;
    particle.addImage(assets.images.particles[index % imageCount]);
    particle.setSpeed(random(2, 5), random(0, 360));
    particle.friction = useAllColors ? 0.05 : 0.1;
    particle.life = useAllColors ? 30 : 18;
    groups.particles.add(particle);
  }
}

function updateLevel() {
  let nextLevelIndex = state.levelIndex + 1;
  while (state.score >= getLevelConfig(nextLevelIndex).score) {
    state.levelIndex = nextLevelIndex;
    groups.stars.forEach((star) => {
      const previousGravity = getLevelConfig(state.levelIndex - 1).gravity;
      const currentGravity = getLevelConfig(state.levelIndex).gravity;
      star.baseSpeed *= currentGravity / previousGravity;
    });
    createHeart();
    state.waveNoticeUntil = millis() + 2200;
    const wave = state.levelIndex + 1;
    if (wave % GAME.bossWaveInterval === 0 && !state.bossWaves.has(wave)) {
      state.bossWaves.add(wave);
      createBoss(wave);
    }
    nextLevelIndex += 1;
  }
}

function getLevelConfig(levelIndex) {
  if (levelIndex < LEVELS.length) return LEVELS[levelIndex];

  const finalPreset = LEVELS[LEVELS.length - 1];
  const extraLevels = levelIndex - (LEVELS.length - 1);
  const scoreGrowth =
    extraLevels * ENDLESS.scoreStep +
    ((extraLevels - 1) * extraLevels * ENDLESS.scoreStepGrowth) / 2;
  return {
    score: finalPreset.score + scoreGrowth,
    gravity: Math.min(
      ENDLESS.maxGravity,
      finalPreset.gravity + extraLevels * ENDLESS.gravityStep
    ),
  };
}

function createBoss(wave) {
  removeGroupSprites(groups.stars);
  const boss = createSprite(width / 2, -80, 150, 64);
  boss.addImage(assets.images.boss);
  boss.scale = 1.8;
  boss.setCollider("rectangle", 0, 0, 68, 46);
  boss.health = 18 + wave * 3;
  boss.maxHealth = boss.health;
  boss.points = wave * 20;
  boss.phase = 0;
  boss.nextShotAt = millis() + 1250;
  boss.setSpeed(1.8, 90);
  groups.bosses.add(boss);
}

function updateBosses() {
  groups.bosses.forEach((boss) => {
    if (boss.position.y >= 145) {
      boss.velocity.y = 0;
      boss.phase += 0.025;
      boss.position.x = width / 2 + Math.sin(boss.phase) * 260;
    }
    if (millis() >= boss.nextShotAt) {
      createEnemyBullet(boss.position.x, boss.position.y + 35);
      boss.nextShotAt = millis() + 1100;
    }
  });
}

function createEnemyBullet(x, y) {
  const projectile = createSprite(x, y, 12, 18);
  projectile.addImage(assets.images.bossLaser);
  projectile.scale = 0.5;
  projectile.setCollider("rectangle", 0, 0, 22, 44);
  projectile.setSpeed(6, 90);
  projectile.life = 100;
  groups.enemyBullets.add(projectile);
}

function bulletHitBoss(bullet, boss) {
  if (bullet.removed || boss.removed || boss.destroyed) return;
  bullet.remove();
  damageBoss(boss, 1, true);
}

function specialHitBoss(_special, boss) {
  if (boss.removed || boss.destroyed) return;
  damageBoss(boss, 8, false);
}

function damageBoss(boss, damage, awardsSpecialCharge) {
  if (boss.removed || boss.destroyed) return;
  boss.health -= damage;
  createParticles(boss.position.x, boss.position.y, 6, false);
  state.flashUntil = millis() + 60;
  if (boss.health > 0) return;
  boss.destroyed = true;
  const points = boss.points;
  createParticles(boss.position.x, boss.position.y, 50, true);
  boss.remove();
  state.score += points * comboMultiplier();
  if (awardsSpecialCharge) state.specialCharge = GAME.maxSpecialCharge;
  state.shakeUntil = millis() + 700;
}

function enemyBulletHitShip(projectile) {
  if (projectile.removed || state.screen !== SCREEN.PLAYING) return;
  projectile.remove();
  state.combo = 0;
  triggerImpactEffects();
  assets.sounds.baseHit.play();
  endGame();
}

function drawWaveAnnouncement() {
  if (millis() >= state.waveNoticeUntil) return;
  push();
  setTextStyle(24, BOLD);
  text(`WAVE ${state.levelIndex + 1}`, width / 2, height / 2 - 30);
  if ((state.levelIndex + 1) % GAME.bossWaveInterval === 0) {
    setTextStyle(14, BOLD);
    fill(255, 80, 180);
    text("BOSS INCOMING", width / 2, height / 2 + 10);
  }
  pop();
}

function updateHealthBar() {
  sprites.healthBar.width = (state.health / GAME.maxHealth) * width;
  if (state.health <= 30) {
    sprites.healthBar.shapeColor = color(247, 10, 10);
  } else if (state.health <= 50) {
    sprites.healthBar.shapeColor = color(255, 156, 0);
  } else {
    sprites.healthBar.shapeColor = color(0, 253, 47);
  }
}

function endGame() {
  if (state.screen === SCREEN.GAME_OVER) return;
  state.screen = SCREEN.GAME_OVER;
  state.highScore = Math.max(state.highScore, state.score);
  saveHighScore(state.highScore);
  assets.sounds.gameOver.play();
  assets.sounds.gameMusic.stop();
  assets.sounds.gameOverMusic.loop();
  removeGroupSprites(groups.stars);
  removeGroupSprites(groups.bullets);
  removeGroupSprites(groups.hearts);
  removeGroupSprites(groups.specials);
  removeGroupSprites(groups.particles);
  removeGroupSprites(groups.powerUps);
  removeGroupSprites(groups.bosses);
  removeGroupSprites(groups.enemyBullets);
}

function drawGameOverScreen() {
  background(assets.images.background);
  setTextStyle(25);
  text("GAME OVER", width / 2, height / 2 - 100);
  text(`Your Score: ${state.score}`, width / 2, height / 2 - 70);
  setTextStyle(12, NORMAL);
  text(`Best Combo: ${state.maxCombo}`, width / 2, height / 2 - 42);
  drawBlinkingText('Press "R" or tap to play again.', height / 2 - 180);

  if (!state.explosionCreated) {
    const explosion = createSprite(width / 2, height / 2, 50, 50);
    explosion.addAnimation("explosion", assets.animations.explosion);
    explosion.life = GAME.frameRate * 3;
    groups.explosions.add(explosion);
    state.explosionCreated = true;
  }
  drawSprites(groups.explosions);
  if (keyWentDown("r")) resetGame();
}

function resetGame() {
  removeGroupSprites(groups.explosions);
  removeGroupSprites(groups.particles);
  removeGroupSprites(groups.powerUps);
  removeGroupSprites(groups.bosses);
  removeGroupSprites(groups.enemyBullets);
  state.screen = SCREEN.PLAYING;
  state.paused = false;
  state.score = 0;
  state.health = GAME.maxHealth;
  state.levelIndex = 0;
  state.explosionCreated = false;
  state.combo = 0;
  state.maxCombo = 0;
  state.specialCharge = 0;
  state.nextShotAt = 0;
  state.waveNoticeUntil = millis() + 1800;
  state.bossWaves = new Set();
  state.powerUps.rapidFireUntil = 0;
  state.powerUps.spreadShotUntil = 0;
  state.powerUps.slowTimeUntil = 0;
  state.powerUps.shieldHits = 0;
  sprites.ship.position.x = width / 2;
  sprites.ship.velocity.x = 0;
  updateHealthBar();
  assets.sounds.gameOverMusic.stop();
  assets.sounds.gameMusic.loop();
}

function removeGroupSprites(group) {
  while (group.length > 0) group[0].remove();
}

function drawBlinkingText(message, y) {
  if (Math.floor(millis() / 500) % 2 === 0) text(message, width / 2, y);
}

function setTextStyle(size, style) {
  textAlign(CENTER);
  textSize(size);
  textStyle(style || NORMAL);
  fill(255);
}

function updateExternalUi() {
  const activeEffects = document.getElementById("active-effects");
  const bossStatus = document.getElementById("boss-status");
  if (!activeEffects || !bossStatus) return;

  const activePowerUps = getActivePowerUpNames();
  const effects = activePowerUps.length > 0 ? activePowerUps : ["No active power-ups"];
  const signature = effects.join("|");
  if (activeEffects.dataset.signature !== signature) {
    activeEffects.replaceChildren(
      ...effects.map((effect) => {
        const item = document.createElement("li");
        item.textContent = effect;
        return item;
      })
    );
    activeEffects.dataset.signature = signature;
  }

  const boss = groups.bosses[0];
  bossStatus.hidden = !boss;
  bossStatus.textContent = boss
    ? `Boss HP: ${Math.max(0, boss.health)} / ${boss.maxHealth}`
    : "";
}

function bindTouchControls(canvasElement) {
  const controls = document.querySelector(".touch-controls");
  controls.addEventListener("contextmenu", (event) => event.preventDefault());

  controls.querySelectorAll("[data-control]").forEach((button) => {
    const control = button.dataset.control;

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);

      if (control === "left" || control === "right") {
        touchControls[control] = true;
      }
      if (state.screen === SCREEN.PLAYING && control === "special") useSpecial();
      if (control === "pause" && state.screen === SCREEN.PLAYING) togglePause();
    });

    const releaseControl = () => {
      if (control === "left" || control === "right") {
        touchControls[control] = false;
      }
    };
    button.addEventListener("pointerup", releaseControl);
    button.addEventListener("pointercancel", releaseControl);
    button.addEventListener("lostpointercapture", releaseControl);
  });

  canvasElement.addEventListener("pointerdown", () => {
    if (touchMode && state.screen === SCREEN.START) startGame();
    if (touchMode && state.screen === SCREEN.GAME_OVER) resetGame();
  });
}

function bindGuideModal() {
  const guide = document.getElementById("game-guide");
  const openButton = document.getElementById("guide-toggle");
  const closeButton = guide.querySelector(".guide-close");

  if (!touchMode) {
    guide.show();
    return;
  }

  openButton.addEventListener("click", () => {
    if (state.screen === SCREEN.PLAYING && !state.paused) {
      guidePaused = true;
      setPaused(true);
    }
    guide.showModal();
  });

  closeButton.addEventListener("click", () => guide.close());
  guide.addEventListener("click", (event) => {
    if (event.target === guide) guide.close();
  });
  guide.addEventListener("close", () => {
    if (guidePaused) {
      guidePaused = false;
      setPaused(false);
    }
  });
}

function bindOrientationHandling() {
  const handleOrientation = () => {
    const isPortrait = touchMode && window.innerHeight > window.innerWidth;
    document.documentElement.classList.toggle("portrait-mode", isPortrait);

    if (isPortrait && state.screen === SCREEN.PLAYING && !state.paused) {
      orientationPaused = true;
      setPaused(true);
    } else if (!isPortrait && orientationPaused) {
      orientationPaused = false;
      setPaused(false);
    }
  };

  window.addEventListener("resize", handleOrientation);
  window.addEventListener("orientationchange", handleOrientation);
  handleOrientation();
}

function keyPressed(event) {
  if (event && event.repeat) return false;
  if (keyCode === 77) toggleMute();
  if (keyCode === 80 && state.screen === SCREEN.PLAYING) togglePause();
  return !CONTROL_KEY_CODES.has(keyCode);
}

function toggleMute() {
  state.muted = !state.muted;
  masterVolume(state.muted ? 0 : 0.05);
}

function togglePause() {
  setPaused(!state.paused);
}

function setPaused(isPaused) {
  state.paused = isPaused;
  assets.sounds.pause.play();
  if (state.paused) {
    assets.sounds.gameMusic.pause();
    noLoop();
    redraw();
  } else {
    assets.sounds.gameMusic.loop();
    loop();
  }
}

function drawPauseOverlay() {
  push();
  noStroke();
  fill(0, 0, 0, 170);
  rect(0, 0, width, height);
  setTextStyle(24, BOLD);
  text("PAUSED", width / 2, height / 2);
  setTextStyle(10, NORMAL);
  text('Press "P" to resume', width / 2, height / 2 + 35);
  pop();
}

function loadHighScore() {
  try {
    const value = Number.parseInt(localStorage.getItem(STORAGE_KEYS.highScore), 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch (error) {
    return 0;
  }
}

function saveHighScore(highScore) {
  try {
    localStorage.setItem(STORAGE_KEYS.highScore, String(highScore));
  } catch (error) {
    // Storage may be unavailable in private browsing or restricted contexts.
  }
}
