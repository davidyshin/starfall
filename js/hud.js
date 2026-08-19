// In-game rendering and heads-up display components.
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
  drawOverdriveChargePips(110, 125);
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

function drawOverdriveChargePips(x, y) {
  const pipWidth = 44;
  const pipHeight = 9;
  const gap = 8;
  const totalWidth = GAME.maxOverdriveCharges * pipWidth +
    (GAME.maxOverdriveCharges - 1) * gap;
  const burstActive = millis() < state.powerUps.overdriveUntil;
  push();
  rectMode(CENTER);
  noStroke();
  for (let index = 0; index < GAME.maxOverdriveCharges; index += 1) {
    const pipX = x - totalWidth / 2 + pipWidth / 2 + index * (pipWidth + gap);
    fill(0, 190);
    rect(pipX, y, pipWidth + 4, pipHeight + 4);
    const charged = index < state.powerUps.overdriveCharges;
    fill(charged ? color(255, 70, 185) : color(55, 35, 52, 230));
    rect(pipX, y, pipWidth, pipHeight);
    if (charged) {
      fill(255, 185, 230, 170);
      rect(pipX, y - 2, pipWidth - 8, 2);
    } else if (
      index === state.powerUps.overdriveCharges &&
      state.powerUps.nextOverdriveChargeAt > 0
    ) {
      textAlign(CENTER);
      textSize(6);
      textStyle(BOLD);
      fill(255, 150, 215);
      text(`${secondsRemaining(state.powerUps.nextOverdriveChargeAt)}s`, pipX, y + 2);
    }
  }
  setTextStyle(8, BOLD);
  if (burstActive) fill(255, 225, 245);
  const label = burstActive
    ? `OVERDRIVE ${secondsRemaining(state.powerUps.overdriveUntil)}s`
    : `OVERDRIVE ${state.powerUps.overdriveCharges} / ${GAME.maxOverdriveCharges} [X]`;
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
