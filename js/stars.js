// Falling stars, pickups, particles, and level progression.
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
      name: "Overdrive Reload",
      image: assets.images.powerUps.overdriveReload,
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
  if (powerUp.powerUpType === "Overdrive Reload") {
    state.powerUps.overdriveCharges = GAME.maxOverdriveCharges;
    state.powerUps.nextOverdriveChargeAt = 0;
  }
  if (powerUp.powerUpType === "Slow Time") state.powerUps.slowTimeUntil = expiresAt;
  if (powerUp.powerUpType === "Shield") state.powerUps.shieldHits += 2;
  assets.sounds.life.play();
  powerUp.remove();
}

function updateOverdriveCharges() {
  if (state.powerUps.overdriveCharges >= GAME.maxOverdriveCharges) {
    state.powerUps.nextOverdriveChargeAt = 0;
    return;
  }
  if (state.powerUps.nextOverdriveChargeAt === 0) {
    state.powerUps.nextOverdriveChargeAt = millis() + GAME.overdriveRechargeMs;
    return;
  }
  if (millis() >= state.powerUps.nextOverdriveChargeAt) {
    restoreOverdriveCharge();
  }
}

function restoreOverdriveCharge() {
  if (state.powerUps.overdriveCharges >= GAME.maxOverdriveCharges) return;
  state.powerUps.overdriveCharges += 1;
  state.powerUps.nextOverdriveChargeAt =
    state.powerUps.overdriveCharges < GAME.maxOverdriveCharges
      ? millis() + GAME.overdriveRechargeMs
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
