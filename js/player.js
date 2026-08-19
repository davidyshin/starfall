// Player movement, weapons, and special effects.
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
  const overdriveActive = millis() < state.powerUps.overdriveUntil;
  const angles = overdriveActive ? [258, 270, 282] : [270];
  angles.forEach((angle) => createBullet(angle, !overdriveActive));
  let cooldown = GAME.shotCooldownMs;
  if (overdriveActive) cooldown = GAME.overdriveShotCooldownMs;
  state.nextShotAt = millis() + cooldown;
  assets.sounds.bullet.setVolume(0.3);
  assets.sounds.bullet.play();
}

function activateOverdrive() {
  if (
    state.powerUps.overdriveCharges <= 0 ||
    millis() < state.powerUps.overdriveUntil
  ) {
    return;
  }
  state.powerUps.overdriveCharges -= 1;
  state.powerUps.overdriveUntil = millis() + GAME.overdriveBurstDurationMs;
  if (state.powerUps.nextOverdriveChargeAt === 0) {
    state.powerUps.nextOverdriveChargeAt =
      millis() + GAME.overdriveRechargeMs;
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
