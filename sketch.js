/* global Group, LEFT, CENTER, BOLD, NORMAL, PI, TWO_PI */

const CANVAS = Object.freeze({ width: 800, height: 600 });
const VERSION = "1.1.10";
const SCREEN = Object.freeze({
  START: "start",
  PLAYING: "playing",
  GAME_OVER: "game-over",
});
const STORAGE_KEYS = Object.freeze({ highScore: "starfall.highScore" });
const CONTROL_KEY_CODES = new Set([32, 37, 39, 77, 80, 88, 90]);
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
  maxSpreadCharges: 3,
  spreadBurstDurationMs: 12000,
  spreadPassiveRechargeMs: 35000,
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
    spreadShotUnlocked: true,
    spreadCharges: GAME.maxSpreadCharges,
    spreadBurstUntil: 0,
    nextSpreadChargeAt: 0,
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
    spreadShot: loadImage("assets/powerups-v4/spread-shot.png"),
    slowTime: loadImage("assets/powerups-v4/slow-time.png"),
    shield: loadImage("assets/powerups-v4/shield.png"),
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
  assets.images.singleBullet = assets.images.bullet.get();
  assets.images.singleBullet.resize(
    Math.round(assets.images.bullet.width * 1.8),
    Math.round(assets.images.bullet.height * 1.15)
  );

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
  sprites.base.shapeColor = color(0);
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
  updatePowerUps();
  updateSpreadCharges();
  removeOffscreenPlayerShots();
  if ((keyDown("space") || touchMode) && millis() >= state.nextShotAt) {
    shoot();
  }
  groups.bullets.overlap(groups.stars, bulletHitStar);
  groups.bullets.overlap(groups.bosses, bulletHitBoss);
  groups.stars.overlap(sprites.base, starHitBase);
  groups.hearts.overlap(sprites.ship, collectHeart);
  groups.powerUps.overlap(sprites.ship, collectPowerUp);
  groups.enemyBullets.overlap(sprites.ship, enemyBulletHitShip);
  groups.specials.overlap(groups.stars, specialHitStar);
  groups.specials.overlap(groups.bosses, specialHitBoss);
  groups.specials.overlap(groups.enemyBullets, specialHitEnemyBullet);
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
  drawBossShotWarnings();
  drawSpecialEffects();
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
  push();
  textAlign(RIGHT);
  text(`Score: ${state.score}`, width - 18, 55);
  text(`Hi-Score: ${state.highScore}`, width - 18, 70);
  pop();
  text(`Level: ${state.levelIndex + 1}`, 70, 55);
  text(`Combo: x${comboMultiplier()} (${state.combo})`, 110, 70);
  drawHudMeter("CITY", state.health, GAME.maxHealth, width / 2, 62, 230, color(70, 255, 190), false, 11);
  const specialReady = state.specialCharge >= GAME.maxSpecialCharge;
  drawHudMeter(
    specialReady ? "NOVA READY [Z]" : "NOVA [Z]",
    state.specialCharge,
    GAME.maxSpecialCharge,
    110,
    94,
    160,
    color(109, 188, 255),
    specialReady
  );
  if (state.powerUps.spreadShotUnlocked) {
    drawTripleChargePips(110, 125);
  }
  drawBossHealthBar();
  drawActiveEffectHud();
}

function drawBossHealthBar() {
  const boss = groups.bosses[0];
  if (!boss) return;
  const burstActive = millis() < boss.burstUntil;
  const bossLabel = burstActive
    ? "BOSS // BURST"
    : boss.attackPhase === 3
      ? "BOSS // ENRAGED"
      : "BOSS";
  const meterWidth = 260;
  const meterHeight = 10;
  const x = width / 2;
  const y = 94;
  push();
  rectMode(CENTER);
  noStroke();
  fill(0, 190);
  rect(x, y, meterWidth + 4, meterHeight + 4);
  rectMode(CORNER);
  fill(40, 20, 38, 230);
  rect(x - meterWidth / 2, y - meterHeight / 2, meterWidth, meterHeight);
  fill(burstActive ? color(255, 215, 70) : color(255, 80, 180));
  rect(
    x - meterWidth / 2,
    y - meterHeight / 2,
    meterWidth * (Math.max(0, boss.health) / boss.maxHealth),
    meterHeight
  );
  setTextStyle(8, BOLD);
  text(
    `${bossLabel} ${Math.max(0, boss.health)} / ${boss.maxHealth}`,
    x,
    y + 18
  );
  pop();
}

function drawBossShotWarnings() {
  groups.bosses.forEach((boss) => {
    if (!boss.burstVolleyAt || millis() >= boss.burstVolleyAt) return;
    const warningProgress = constrain(
      1 - (boss.burstVolleyAt - millis()) / 280,
      0,
      1
    );
    const originX = boss.position.x;
    const originY = boss.position.y + 38;
    push();
    strokeWeight(2);
    [76, 90, 104].forEach((angle, angleIndex) => {
      const radians = (angle * Math.PI) / 180;
      const distance = height - originY + 80;
      const endX = originX + Math.cos(radians) * distance;
      const endY = originY + Math.sin(radians) * distance;
      stroke(255, 70, 185, 55 + warningProgress * 150);
      line(originX, originY, endX, endY);
      noStroke();
      for (let marker = 1; marker <= 5; marker += 1) {
        const amount = marker / 6;
        const markerSize = 3 + warningProgress * 5;
        fill(angleIndex === 1 ? color(255, 225, 90, 220) : color(255, 95, 200, 210));
        ellipse(
          originX + (endX - originX) * amount,
          originY + (endY - originY) * amount,
          markerSize
        );
      }
    });
    pop();
  });
}

function drawHudMeter(label, value, maximum, x, y, meterWidth, meterColor, pulse, height) {
  const meterHeight = height || 8;
  const pulseOn = pulse && Math.floor(millis() / 250) % 2 === 0;
  push();
  rectMode(CENTER);
  noStroke();
  fill(pulseOn ? color(255, 220) : color(0, 190));
  rect(x, y, meterWidth + 4, meterHeight + 4);
  rectMode(CORNER);
  fill(25, 35, 42, 230);
  rect(x - meterWidth / 2, y - meterHeight / 2, meterWidth, meterHeight);
  fill(pulseOn ? color(255) : meterColor);
  rect(x - meterWidth / 2, y - meterHeight / 2, meterWidth * (value / maximum), meterHeight);
  setTextStyle(8, BOLD);
  if (pulseOn) fill(255, 245, 145);
  text(`${label} ${Math.floor(value)}%`, x, y + 17);
  pop();
}

function drawTripleChargePips(x, y) {
  const pipWidth = 44;
  const pipHeight = 9;
  const gap = 8;
  const totalWidth = GAME.maxSpreadCharges * pipWidth +
    (GAME.maxSpreadCharges - 1) * gap;
  const burstActive = millis() < state.powerUps.spreadBurstUntil;
  push();
  rectMode(CENTER);
  noStroke();
  for (let index = 0; index < GAME.maxSpreadCharges; index += 1) {
    const pipX = x - totalWidth / 2 + pipWidth / 2 + index * (pipWidth + gap);
    fill(0, 190);
    rect(pipX, y, pipWidth + 4, pipHeight + 4);
    const charged = index < state.powerUps.spreadCharges;
    fill(charged ? color(255, 70, 185) : color(55, 35, 52, 230));
    rect(pipX, y, pipWidth, pipHeight);
    if (charged) {
      fill(255, 185, 230, 170);
      rect(pipX, y - 2, pipWidth - 8, 2);
    } else if (
      index === state.powerUps.spreadCharges &&
      state.powerUps.nextSpreadChargeAt > 0
    ) {
      textAlign(CENTER);
      textSize(6);
      textStyle(BOLD);
      fill(255, 150, 215);
      text(`${secondsRemaining(state.powerUps.nextSpreadChargeAt)}s`, pipX, y + 2);
    }
  }
  setTextStyle(8, BOLD);
  if (burstActive) fill(255, 225, 245);
  const label = burstActive
    ? `OVERDRIVE ${secondsRemaining(state.powerUps.spreadBurstUntil)}s`
    : `OVERDRIVE ${state.powerUps.spreadCharges} / ${GAME.maxSpreadCharges} [X]`;
  text(label, x, y + 18);
  pop();
}

function drawActiveEffectHud() {
  const effects = getActivePowerUpNames();
  if (effects.length === 0) return;
  const panelX = width - 245;
  const panelY = 84;
  const panelWidth = 225;
  const panelHeight = 25 + effects.length * 15;
  push();
  rectMode(CORNER);
  fill(3, 9, 10, 125);
  stroke(49, 91, 101);
  strokeWeight(1.5);
  rect(panelX, panelY, panelWidth, panelHeight);
  noStroke();
  setTextStyle(8, BOLD);
  textAlign(LEFT);
  fill(134, 208, 214);
  text("STATUS", panelX + 9, panelY + 13);
  effects.forEach((effect, index) => {
    fill(190, 245, 235);
    text(effect, panelX + 9, panelY + 29 + index * 15);
  });
  pop();
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
  const chargedBurstActive = millis() < state.powerUps.spreadBurstUntil;
  const spreadActive =
    chargedBurstActive && state.powerUps.spreadShotUnlocked;
  const angles = spreadActive ? [258, 270, 282] : [270];
  angles.forEach((angle) => createBullet(angle, !spreadActive));
  let cooldown = GAME.shotCooldownMs;
  if (chargedBurstActive) cooldown = GAME.overdriveShotCooldownMs;
  state.nextShotAt = millis() + cooldown;
  assets.sounds.bullet.setVolume(0.3);
  assets.sounds.bullet.play();
}

function activateOverdrive() {
  if (
    state.powerUps.spreadCharges <= 0 ||
    millis() < state.powerUps.spreadBurstUntil
  ) {
    return;
  }
  state.powerUps.spreadCharges -= 1;
  state.powerUps.spreadBurstUntil = millis() + GAME.spreadBurstDurationMs;
  if (state.powerUps.nextSpreadChargeAt === 0) {
    state.powerUps.nextSpreadChargeAt =
      millis() + GAME.spreadPassiveRechargeMs;
  }
}

function createBullet(angle, isSingleShot) {
  const bullet = createSprite(
    sprites.ship.position.x,
    sprites.ship.position.y - 10,
    8,
    18
  );
  bullet.addImage(
    isSingleShot ? assets.images.singleBullet : assets.images.bullet
  );
  bullet.setCollider(
    "rectangle",
    0,
    0,
    isSingleShot ? 14 : 7,
    isSingleShot ? 20 : 17
  );
  bullet.damage = isSingleShot ? 2 : 1;
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
  const special = createSprite(
    sprites.ship.position.x,
    sprites.ship.position.y - 22,
    GAME.specialWidth,
    18
  );
  special.setCollider("rectangle", 0, 0, GAME.specialWidth - 20, 20);
  special.setSpeed(10.5, 270);
  special.life = 70;
  special.visible = false;
  special.pulseOffset = random(TWO_PI);
  groups.specials.add(special);
  assets.sounds.special.play();
  state.specialCharge = 0;
  state.shakeUntil = millis() + 180;
  state.flashUntil = millis() + 90;
}

function drawSpecialEffects() {
  groups.specials.forEach((special, specialIndex) => {
    const pulse = 0.75 + Math.sin(frameCount * 0.45 + special.pulseOffset) * 0.25;
    const x = special.position.x;
    const y = special.position.y;
    const halfWidth = GAME.specialWidth / 2;
    push();
    rectMode(CENTER);
    noStroke();

    // Magenta fringe and cyan body echo the game's power-up and HUD palette.
    fill(255, 55, 185, 24);
    quad(
      x - halfWidth - 24, y + 14,
      x, y - 24 - pulse * 8,
      x + halfWidth + 24, y + 14,
      x, y + 72
    );
    fill(36, 135, 255, 42);
    quad(
      x - halfWidth - 12, y + 8,
      x, y - 17 - pulse * 5,
      x + halfWidth + 12, y + 8,
      x, y + 48
    );
    fill(45, 220, 255, 105);
    quad(
      x - halfWidth, y + 3,
      x, y - 12 - pulse * 4,
      x + halfWidth, y + 3,
      x, y + 27
    );

    // Pixel-stepped wings give the wave a sharper retro silhouette.
    fill(255, 70, 190, 150);
    rect(x - halfWidth + 28, y + 7, 54, 6);
    rect(x + halfWidth - 28, y + 7, 54, 6);
    fill(105, 238, 255, 220);
    rect(x, y, GAME.specialWidth, 9 + pulse * 5);
    fill(225, 255, 255, 245);
    rect(x, y - 2, GAME.specialWidth - 28, 3 + pulse * 3);

    // Orbiting four-point sparks make each frame feel alive without an asset.
    for (let sparkIndex = 0; sparkIndex < 7; sparkIndex += 1) {
      const phase = frameCount * 0.17 + sparkIndex * 1.9 + specialIndex;
      const sparkX = x + Math.sin(phase) * (halfWidth + 13);
      const sparkY = y + 18 + ((sparkIndex * 19 + frameCount * 3) % 54);
      const sparkSize = 3 + (sparkIndex % 3) * 2;
      fill(sparkIndex % 2 === 0 ? color(255, 85, 195, 190) : color(145, 245, 255, 210));
      rect(sparkX, sparkY, sparkSize, sparkSize * 3);
      rect(sparkX, sparkY, sparkSize * 3, sparkSize);
    }
    pop();
  });
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
  star.baseSpeed = getStarGravity(state.levelIndex) * type.speedMultiplier;
  star.addAnimation(type.name, assets.animations[type.animation]);
  star.scale = type.sizeScale;
  star.setCollider("circle", 0, 0, 21);
  star.setSpeed(star.baseSpeed, 90);
  star.rotationSpeed = 2.5;
  groups.stars.add(star);
}

function chooseStarType() {
  const roll = random();
  if (
    state.levelIndex >= 7 &&
    roll < 0.12 &&
    countStarsOfType("red") < GAME.maxRedStars
  ) {
    return {
      name: "red",
      animation: "redStar",
      health: 2,
      points: 5,
      speedMultiplier: 1.1,
      sizeScale: 1.25,
    };
  }
  if (state.levelIndex >= 4 && roll < 0.28) {
    return {
      name: "green",
      animation: "greenStar",
      health: 3,
      points: 4,
      speedMultiplier: 0.72,
      sizeScale: 1.45,
    };
  }
  if (state.levelIndex >= 1 && roll < 0.48) {
    return {
      name: "blue",
      animation: "blueStar",
      health: 1,
      points: 2,
      speedMultiplier: 1.55,
      sizeScale: 1.1,
    };
  }
  return {
    name: "yellow",
    animation: "yellowStar",
    health: 1,
    points: 1,
    speedMultiplier: 1,
    sizeScale: 0.9,
  };
}

function countStarsOfType(type) {
  let count = 0;
  groups.stars.forEach((star) => {
    if (star.starType === type) count += 1;
  });
  return count;
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
  assets.sounds.baseHit.play();
  createParticles(star.position.x, star.position.y + 20, 35, true);
  triggerImpactEffects();
  star.remove();
  if (state.health === 0) endGame();
}

function bulletHitStar(bullet, star) {
  if (bullet.removed || star.removed || star.destroyed) return;
  bullet.remove();
  star.health -= bullet.damage || 1;
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
      state.specialCharge + GAME.specialChargePerStar
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
    {
      name: "Spread Shot",
      image: assets.images.powerUps.spreadShot,
      fallSpeed: 10,
      weight: 0.2,
    },
    { name: "Slow Time", image: assets.images.powerUps.slowTime, weight: 0.4 },
    { name: "Shield", image: assets.images.powerUps.shield, weight: 0.4 },
  ];
  const typeRoll = random();
  let cumulativeWeight = 0;
  const type =
    types.find((candidate) => {
      cumulativeWeight += candidate.weight;
      return typeRoll < cumulativeWeight;
    }) || types[types.length - 1];
  const powerUp = createSprite(x, y, 24, 24);
  powerUp.powerUpType = type.name;
  powerUp.addImage(type.image);
  powerUp.setCollider("circle", 0, 0, GAME.powerUpSize * 0.44);
  powerUp.pulseOffset = random(TWO_PI);
  const fallSpeed = type.fallSpeed || 3;
  powerUp.setSpeed(fallSpeed, 90);
  powerUp.life = Math.ceil((height - y + 100) / fallSpeed);
  groups.powerUps.add(powerUp);
}

function updatePowerUps() {
  groups.powerUps.forEach((powerUp) => {
    powerUp.scale = 0.96 + Math.sin(frameCount * 0.12 + powerUp.pulseOffset) * 0.06;
  });
}

function collectPowerUp(powerUp) {
  const expiresAt = millis() + GAME.powerUpDurationMs;
  if (powerUp.powerUpType === "Spread Shot") {
    state.powerUps.spreadShotUnlocked = true;
    state.powerUps.spreadCharges = GAME.maxSpreadCharges;
    state.powerUps.nextSpreadChargeAt = 0;
  }
  if (powerUp.powerUpType === "Slow Time") state.powerUps.slowTimeUntil = expiresAt;
  if (powerUp.powerUpType === "Shield") state.powerUps.shieldHits += 2;
  assets.sounds.life.play();
  powerUp.remove();
}

function updateSpreadCharges() {
  if (state.powerUps.spreadCharges >= GAME.maxSpreadCharges) {
    state.powerUps.nextSpreadChargeAt = 0;
    return;
  }
  if (state.powerUps.nextSpreadChargeAt === 0) {
    state.powerUps.nextSpreadChargeAt = millis() + GAME.spreadPassiveRechargeMs;
    return;
  }
  if (millis() >= state.powerUps.nextSpreadChargeAt) restoreSpreadCharge();
}

function restoreSpreadCharge() {
  if (state.powerUps.spreadCharges >= GAME.maxSpreadCharges) return;
  state.powerUps.spreadCharges += 1;
  state.powerUps.nextSpreadChargeAt =
    state.powerUps.spreadCharges < GAME.maxSpreadCharges
      ? millis() + GAME.spreadPassiveRechargeMs
      : 0;
}

function getActivePowerUpNames() {
  const names = [];
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
  const strengthRings = Math.min(4, Math.ceil(state.powerUps.shieldHits / 3));
  push();
  noFill();
  stroke(70, 255, 190, 210);
  for (let ring = 0; ring < strengthRings; ring += 1) {
    strokeWeight(2.5);
    arc(width / 2, height - 2, width - 10 - ring * 14, 100 + ring * 12, PI, TWO_PI);
  }
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
      const previousGravity = getStarGravity(state.levelIndex - 1);
      const currentGravity = getStarGravity(state.levelIndex);
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

function getStarGravity(levelIndex) {
  const startingGravity = LEVELS[0].gravity;
  const configuredGravity = getLevelConfig(levelIndex).gravity;
  const postBossWave =
    levelIndex > 0 && levelIndex % GAME.bossWaveInterval === 0;
  const recoveryMultiplier = postBossWave ? 0.86 : 1;
  return (
    (startingGravity + (configuredGravity - startingGravity) * 0.9) *
    0.92 *
    recoveryMultiplier
  );
}

function createBoss(wave) {
  removeGroupSprites(groups.stars);
  const boss = createSprite(width / 2, -90, 160, 160);
  boss.addAnimation("bossStar", assets.animations.redStar);
  boss.scale = 3.2;
  boss.rotationSpeed = -1.2;
  boss.setCollider("circle", 0, 0, 23);
  boss.health = 50 + wave * 6;
  boss.maxHealth = boss.health;
  boss.points = wave * 20;
  boss.difficulty = Math.min(
    6,
    Math.max(0, Math.floor(wave / GAME.bossWaveInterval) - 1)
  );
  boss.projectileSpeed = Math.min(7.2, 6 + boss.difficulty * 0.2);
  boss.phase = 0;
  boss.nextDamageAt = 0;
  boss.nextShotAt = millis() + 1250;
  boss.nextBurstAt = Number.POSITIVE_INFINITY;
  boss.burstUntil = 0;
  boss.burstVolleyAt = 0;
  boss.attackPhase = 1;
  boss.setSpeed(1.8 + boss.difficulty * 0.08, 90);
  groups.bosses.add(boss);
}

function updateBosses() {
  groups.bosses.forEach((boss) => {
    const now = millis();
    const healthRatio = boss.health / boss.maxHealth;
    const attackPhase = healthRatio <= 0.35 ? 3 : healthRatio <= 0.7 ? 2 : 1;
    if (attackPhase !== boss.attackPhase) {
      boss.attackPhase = attackPhase;
      boss.nextBurstAt =
        Math.max(now, boss.burstUntil) + (attackPhase === 3 ? 800 : 1500);
      state.flashUntil = now + 120;
    }
    if (boss.attackPhase >= 2 && now >= boss.nextBurstAt) {
      const burstDuration =
        GAME.bossBurstDurationMs + boss.difficulty * 70;
      boss.burstUntil = now + burstDuration;
      const burstCooldown =
        boss.attackPhase === 3
          ? Math.max(3000, 4000 - boss.difficulty * 150)
          : Math.max(5500, GAME.bossBurstCooldownMs - boss.difficulty * 300);
      boss.nextBurstAt = boss.burstUntil + burstCooldown;
      boss.nextShotAt = now;
      state.flashUntil = now + 100;
      state.shakeUntil = now + 180;
    }
    const burstActive = now < boss.burstUntil;
    boss.rotationSpeed = burstActive
      ? boss.attackPhase === 3
        ? -6
        : -4.5
      : -1.2;

    if (!burstActive) boss.burstVolleyAt = 0;

    if (boss.position.y >= 145) {
      boss.velocity.y = 0;
      boss.phase += burstActive
        ? boss.attackPhase === 3
          ? 0.08 + boss.difficulty * 0.004
          : 0.065 + boss.difficulty * 0.003
        : 0.025 + boss.difficulty * 0.0015;
      boss.position.x = width / 2 + Math.sin(boss.phase) * 260;
    }
    if (burstActive) {
      if (boss.burstVolleyAt && now >= boss.burstVolleyAt) {
        [76, 90, 104].forEach((angle) => {
          createEnemyBullet(
            boss.position.x,
            boss.position.y + 35,
            angle,
            boss.projectileSpeed
          );
        });
        boss.burstVolleyAt = 0;
      }
      if (!boss.burstVolleyAt && now >= boss.nextShotAt) {
        boss.burstVolleyAt = now + 280;
        boss.nextShotAt =
          now +
          (boss.attackPhase === 3
            ? Math.max(320, 400 - boss.difficulty * 14)
            : Math.max(
                410,
                GAME.bossBurstShotCooldownMs - boss.difficulty * 18
              ));
      }
    } else if (now >= boss.nextShotAt) {
      createEnemyBullet(
        boss.position.x,
        boss.position.y + 35,
        90,
        boss.projectileSpeed
      );
      boss.nextShotAt = now + Math.max(850, 1100 - boss.difficulty * 40);
    }
  });
}

function createEnemyBullet(x, y, angle = 90, speed = 6) {
  const projectile = createSprite(x, y, 12, 18);
  projectile.addImage(assets.images.bossLaser);
  projectile.scale = 0.5;
  projectile.setCollider("rectangle", 0, 0, 22, 44);
  projectile.setSpeed(speed, angle);
  projectile.life = 100;
  groups.enemyBullets.add(projectile);
}

function bulletHitBoss(bullet, boss) {
  if (bullet.removed || boss.removed || boss.destroyed) return;
  bullet.remove();
  if (millis() < boss.nextDamageAt) return;
  boss.nextDamageAt = millis() + 65;
  damageBoss(boss, bullet.damage || 1, true);
}

function specialHitBoss(special, boss) {
  if (special.bossHit || boss.removed || boss.destroyed) return;
  special.bossHit = true;
  damageBoss(boss, GAME.specialBossDamage, false);
}

function specialHitEnemyBullet(_special, projectile) {
  if (projectile.removed) return;
  createParticles(projectile.position.x, projectile.position.y, 4, false);
  projectile.remove();
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
  if (awardsSpecialCharge) {
    state.specialCharge = Math.min(
      GAME.maxSpecialCharge,
      state.specialCharge + GAME.specialChargePerBoss
    );
  }
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
  state.powerUps.spreadShotUnlocked = true;
  state.powerUps.spreadCharges = GAME.maxSpreadCharges;
  state.powerUps.spreadBurstUntil = 0;
  state.powerUps.nextSpreadChargeAt = 0;
  state.powerUps.slowTimeUntil = 0;
  state.powerUps.shieldHits = 0;
  sprites.ship.position.x = width / 2;
  sprites.ship.velocity.x = 0;
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

function bindTouchControls(canvasElement) {
  const controls = document.querySelector(".touch-controls");
  controls.addEventListener("contextmenu", (event) => event.preventDefault());
  controls.addEventListener("dblclick", (event) => event.preventDefault());
  controls.addEventListener("selectstart", (event) => event.preventDefault());
  controls.addEventListener("dragstart", (event) => event.preventDefault());
  canvasElement.addEventListener("dblclick", (event) => event.preventDefault());
  document.addEventListener("gesturestart", (event) => event.preventDefault());

  controls.querySelectorAll("[data-control]").forEach((button) => {
    const control = button.dataset.control;

    // iOS Safari can start its text loupe before pointerdown suppression takes
    // effect, so cancel the native touch gesture at its earliest event too.
    button.addEventListener("touchstart", (event) => event.preventDefault(), {
      passive: false,
    });
    button.addEventListener("touchmove", (event) => event.preventDefault(), {
      passive: false,
    });

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();

      if (control === "left" || control === "right") {
        touchControls[control] = true;
      }
      if (state.screen === SCREEN.PLAYING && control === "special") useSpecial();
      if (state.screen === SCREEN.PLAYING && control === "overdrive") {
        activateOverdrive();
      }
      if (control === "pause" && state.screen === SCREEN.PLAYING) togglePause();

      // Some mobile browsers can reject capture for a second simultaneous
      // pointer. The control action must still happen while movement is held.
      try {
        button.setPointerCapture(event.pointerId);
      } catch (_error) {
        // The document-level pointer release below clears movement as fallback.
      }
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

  document.addEventListener("pointerup", (event) => {
    const control = event.target.closest?.("[data-control]")?.dataset.control;
    if (control === "left" || control === "right") touchControls[control] = false;
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
  if (keyCode === 90 && state.screen === SCREEN.PLAYING) useSpecial();
  if (keyCode === 88 && state.screen === SCREEN.PLAYING) activateOverdrive();
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
