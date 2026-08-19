// Wave announcements, game-over flow, and shared text helpers.
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
  state.pausedAt = 0;
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
  state.powerUps.overdriveCharges = GAME.maxOverdriveCharges;
  state.powerUps.overdriveUntil = 0;
  state.powerUps.nextOverdriveChargeAt = 0;
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
