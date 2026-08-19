// Boss lifecycle, attacks, projectiles, and damage handling.
function createBoss(wave) {
  removeGroupSprites(groups.stars);
  const boss = createSprite(width / 2, -90, 160, 160);
  boss.addAnimation("bossStar", assets.animations.redStar);
  boss.scale = 3.2;
  boss.rotationSpeed = -1.2;
  boss.setCollider("circle", 0, 0, 23);
  boss.health = 80 + wave * 10;
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
