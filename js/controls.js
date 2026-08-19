// Keyboard, touch, modal, orientation, fullscreen, and persistence helpers.
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

function bindFullscreen() {
  const button = document.getElementById("fullscreen-toggle");
  const updateButton = () => {
    const active = Boolean(document.fullscreenElement) ||
      document.documentElement.classList.contains("fullscreen-mode");
    button.textContent = active ? "Exit" : "Full";
    button.setAttribute("aria-pressed", String(active));
  };

  button.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", updateButton);
  updateButton();
}

async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  if (document.documentElement.requestFullscreen) {
    try {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      return;
    } catch (_error) {
      // Fall through to a viewport-filling mode when fullscreen is unavailable.
    }
  }
  document.documentElement.classList.toggle("fullscreen-mode");
  document.getElementById("fullscreen-toggle").textContent =
    document.documentElement.classList.contains("fullscreen-mode") ? "Exit" : "Full";
}

function bindMobileGestureGuards() {
  document.addEventListener("touchmove", (event) => {
    if (touchMode && event.touches.length > 1) event.preventDefault();
  }, { passive: false });
  document.addEventListener("selectstart", (event) => {
    if (touchMode) event.preventDefault();
  });
  document.addEventListener("dragstart", (event) => {
    if (touchMode) event.preventDefault();
  });
}

function keyPressed(event) {
  if (event && event.repeat) return false;
  if (keyCode === 77) toggleMute();
  if (keyCode === 70) toggleFullscreen();
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
  if (state.paused === isPaused) return;
  state.paused = isPaused;
  assets.sounds.pause.play();
  if (state.paused) {
    state.pausedAt = millis();
    assets.sounds.gameMusic.pause();
    noLoop();
    redraw();
  } else {
    shiftGameplayTimers(millis() - state.pausedAt);
    state.pausedAt = 0;
    assets.sounds.gameMusic.loop();
    loop();
  }
}

function shiftGameplayTimers(pauseDuration) {
  const shift = (deadline) =>
    deadline > 0 && Number.isFinite(deadline)
      ? deadline + pauseDuration
      : deadline;

  state.nextShotAt = shift(state.nextShotAt);
  state.waveNoticeUntil = shift(state.waveNoticeUntil);
  state.shakeUntil = shift(state.shakeUntil);
  state.flashUntil = shift(state.flashUntil);
  state.powerUps.overdriveUntil = shift(state.powerUps.overdriveUntil);
  state.powerUps.nextOverdriveChargeAt = shift(
    state.powerUps.nextOverdriveChargeAt
  );
  state.powerUps.slowTimeUntil = shift(state.powerUps.slowTimeUntil);

  groups.bosses.forEach((boss) => {
    boss.nextDamageAt = shift(boss.nextDamageAt);
    boss.nextShotAt = shift(boss.nextShotAt);
    boss.nextBurstAt = shift(boss.nextBurstAt);
    boss.burstUntil = shift(boss.burstUntil);
    boss.burstVolleyAt = shift(boss.burstVolleyAt);
  });
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
