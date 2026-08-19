// Main p5 lifecycle and per-frame game orchestration.
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
  updateOverdriveCharges();
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
