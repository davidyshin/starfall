# Starfall

**Current release: 1.1.11**

[Play the live version](https://starfall.netlify.app)

Starfall is a fast-paced JavaScript shooter inspired by 1980s arcade games such as **Galaga**. Destroy the falling stars before they hit the city, collect hearts to restore its health, and save your special attack for emergencies.

The game is endless: waves, score targets, and recurring boss encounters continue for as long as the city survives.

<img src="./assets/preview/startscreen.gif" width="800" height="600" />

## Run locally

Serve the repository with any static web server, then open its local URL. For example:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. Stop the server with <kbd>Ctrl</kbd>+<kbd>C</kbd>.

The game uses its existing vendored p5.js, p5.sound, and legacy p5.play 1.0
builds, so no package installation is required. Game code is split by
responsibility under `js/`, while `sketch.js` contains the main p5 lifecycle and
game loop. Updating the tightly coupled p5/p5.play runtime should be handled as
a separate migration.

## Preview

<img src="./assets/preview/preview.gif" width="800" height="600" />

<img src="./assets/preview/gameover.gif" width="800" height="600" />

## Controls

- <kbd>←</kbd> and <kbd>→</kbd>: move
- <kbd>Space</kbd>: shoot
- <kbd>Z</kbd>: use the special attack
- <kbd>X</kbd>: activate an Overdrive charge
- <kbd>F</kbd>: enter or exit fullscreen
- <kbd>P</kbd>: pause or resume
- <kbd>M</kbd>: mute or unmute

On mobile, rotate to landscape. Firing is automatic; use the corner arrows to move and the on-screen buttons for Nova, Overdrive, pause, and the guide. Fullscreen controls are desktop-only.

Your high score is saved in the browser.

## Gameplay features

- Consecutive hits build a combo multiplier of up to 5×. Taking a hit resets it.
- Blue stars are fast, green stars are armored, and red stars weave as they fall.
- Overdrive stores three burst charges activated with X. Each charge powers 12 seconds of combined rapid fire and triple shot, and one charge returns every 35 seconds. The leftmost empty HUD pip shows the cooldown until the next charge. Heart pickups restore city health only. Without Overdrive, firing uses the larger, stronger single shot. Destroyed stars can occasionally drop an instant three-charge Overdrive refill, slow time, or a two-hit shield; each pickup has a unique animated silhouette as well as color, and timed effects appear in the in-game HUD.
- Hits charge the special meter; press <kbd>Z</kbd> when it reaches 100%.
- Every fifth wave becomes a dedicated giant-star boss encounter with no regular stars. Bosses move and fire energy shots that only collide with the ship; one direct hit ends the run.
- Screen shake, flashes, particles, and wave announcements provide combat feedback.

## Technical overview

Starfall is a static browser game built on p5.js, p5.sound, and the legacy
p5.play 1.0 API. It has no bundler, package manager, compilation step, or
backend. All scripts are classic browser scripts and intentionally share one
global runtime.

The internal canvas is always 800×600. CSS scales that fixed 4:3 surface for
different displays, so rendering and collision coordinates stay deterministic.
Desktop fullscreen uses the browser Fullscreen API with a viewport-filling
fallback. Mobile keeps the normal browser presentation and disables native
gestures that interfere with the touch controls.

### Source layout

| Path | Responsibility |
| --- | --- |
| `index.html` | Script order, touch controls, player guide, and power-up descriptions |
| `style.css` | Responsive layout, fullscreen presentation, touch controls, and mobile gesture protection |
| `sketch.js` | Main p5 draw loop and per-frame orchestration |
| `js/config.js` | Immutable tuning constants, wave presets, key codes, and release version |
| `js/state.js` | Shared mutable state plus sprite and group registries |
| `js/assets.js` | p5 `preload()`, `setup()`, asset loading, sprite groups, and input initialization |
| `js/player.js` | Movement, normal fire, Overdrive, bullets, and Nova rendering |
| `js/stars.js` | Star types, collisions, drops, Overdrive recharge, particles, and level progression |
| `js/boss.js` | Boss creation, health phases, burst patterns, projectiles, and damage |
| `js/hud.js` | HUD meters, Overdrive pips, boss warnings, and status indicators |
| `js/screens.js` | Wave notices, game-over flow, reset behavior, and shared drawing helpers |
| `js/controls.js` | Keyboard, multitouch, pause, fullscreen, orientation, and persistence |
| `assets/` | Images, animations, sounds, fonts, and preview media |
| `p5/` | Vendored runtime dependencies |

Script order matters because these are classic scripts rather than ES modules.
Configuration and state load first, feature files load next, and `sketch.js`
loads last:

```html
<script defer src="js/config.js"></script>
<script defer src="js/state.js"></script>
<script defer src="js/assets.js"></script>
<!-- HUD, gameplay systems, screens, and controls -->
<script defer src="sketch.js"></script>
```

### Frame lifecycle

p5 calls `draw()` at 40 frames per second. The top-level loop selects a screen,
updates gameplay only when appropriate, and then renders the current state:

```js
function draw() {
  if (state.screen === SCREEN.START) return drawStartScreen();
  if (state.screen === SCREEN.GAME_OVER) return drawGameOverScreen();
  if (state.paused) {
    drawGame();
    drawPauseOverlay();
    return;
  }
  updateGame();
  drawGame();
}
```

`updateGame()` owns the order-sensitive simulation pipeline:

1. Refill the regular-star population when no boss is active.
2. Update the ship, stars, bosses, pickups, and Overdrive charges.
3. Fire when input and cooldown state allow it.
4. Resolve p5.play group overlaps.
5. Advance waves and persist a new high score.

Collision callbacks are deliberately registered in one place, making the
interaction graph easy to audit:

```js
groups.bullets.overlap(groups.stars, bulletHitStar);
groups.bullets.overlap(groups.bosses, bulletHitBoss);
groups.specials.overlap(groups.enemyBullets, specialHitEnemyBullet);
groups.enemyBullets.overlap(sprites.ship, enemyBulletHitShip);
```

### Configuration and balancing

Gameplay tuning belongs in `GAME`, `LEVELS`, and `ENDLESS` inside
`js/config.js`. Avoid scattering numeric balance values through feature files.
For example, the current Overdrive model is configured in one block:

```js
const GAME = Object.freeze({
  maxOverdriveCharges: 3,
  overdriveBurstDurationMs: 12000,
  overdriveRechargeMs: 35000,
  overdriveShotCooldownMs: 80,
});
```

An Overdrive charge is explicitly activated, never toggled. It is consumed in
`activateOverdrive()`, starts a deadline, and schedules passive recovery when
the first empty slot appears:

```js
state.powerUps.overdriveCharges -= 1;
state.powerUps.overdriveUntil = millis() + GAME.overdriveBurstDurationMs;

if (state.powerUps.nextOverdriveChargeAt === 0) {
  state.powerUps.nextOverdriveChargeAt =
    millis() + GAME.overdriveRechargeMs;
}
```

Regular waves use preset score and gravity values from `LEVELS`. Endless waves
continue from the final preset using `ENDLESS`, with a capped gravity value.
Every fifth wave is a boss encounter, and the following wave receives a small
speed reduction as a recovery round.

Boss durability scales from its wave number. Attack difficulty also scales by
boss encounter and is capped: later bosses move faster, fire quicker
projectiles, and shorten burst cooldowns without growing without bound. Health
phases control behavior within an encounter:

- Above 70% health: single-projectile attacks.
- At or below 70%: telegraphed three-shot bursts begin.
- At or below 35%: the boss becomes enraged and accelerates its burst pattern.

### Shared state

`js/state.js` contains the mutable values that must be visible to multiple game
systems. Sprite collections are held separately from scalar game state:

```js
const groups = {};
const sprites = {};

const state = {
  screen: SCREEN.START,
  score: 0,
  health: GAME.maxHealth,
  powerUps: {
    overdriveCharges: GAME.maxOverdriveCharges,
    overdriveUntil: 0,
    nextOverdriveChargeAt: 0,
  },
};
```

New cross-system state should be added here. Temporary values used by one
sprite—such as boss phase, star type, or projectile damage—should remain on the
sprite itself.

### Timers and pausing

Gameplay timers are absolute `millis()` deadlines rather than decrementing
counters. A typical check is:

```js
const overdriveActive = millis() < state.powerUps.overdriveUntil;
```

p5's clock continues while `noLoop()` is active, so pausing records the pause
start and shifts every gameplay deadline forward on resume. Any new deadline
that affects gameplay must be added to `shiftGameplayTimers()` in
`js/controls.js`; otherwise it will expire while paused.

### Input model

Desktop input uses p5/p5.play keyboard state plus `keyPressed()` for one-shot
actions. Movement is frame-polled, while Nova and Overdrive activate directly
from keyboard events so simultaneous keys cannot lose an input edge.

Touch movement uses independent pointer state for left and right. Action buttons
fire on `pointerdown`, allowing movement and an action to be held by different
fingers. Pointer capture is best-effort because some mobile browsers reject
capture for a second pointer.

### Adding a power-up

1. Load and resize its image in `js/assets.js`.
2. Add a weighted entry to `createPowerUp()` in `js/stars.js`.
3. Apply its state change in `collectPowerUp()`.
4. If timed, display it in `getActivePowerUpNames()` and add its deadline to
   `shiftGameplayTimers()`.
5. Add player-facing copy and an icon to the guide in `index.html`.

Power-up weights should total `1`. The current distribution is 20% Overdrive
Reload, 40% Slow Time, and 40% Shield.

### Validation and smoke testing

There is no automated browser test suite yet. Before committing, run syntax and
whitespace checks:

```sh
for file in js/*.js sketch.js; do node --check "$file" || exit 1; done
git diff --check
```

Then perform a browser smoke test:

1. Start a local server and load the start screen without console errors.
2. Verify movement plus Nova/Overdrive simultaneous input.
3. Confirm Overdrive consumes one charge, lasts 12 seconds, and restores a
   charge after 35 seconds.
4. Pause during Overdrive, Slow Time, and a boss warning; confirm timers freeze.
5. Reach a boss wave and verify warning lanes, health phases, and Nova projectile
   interception.
6. Test landscape touch controls without selection, callouts, or page zoom.
7. Test desktop fullscreen and confirm the guide is hidden until fullscreen
   exits.

### Release checklist

For a versioned release, update the same value in all three locations:

- `VERSION` in `js/config.js` for the in-game HUD.
- `application-version` in `index.html`.
- `Current release` at the top of this README.

Keep generated dependencies out of the repository; the runtime libraries are
already vendored under `p5/`.

## Author

[David Shin](https://github.com/davidyshin)

## Acknowledgements

[Helen Cho](https://github.com/helencho)

Boss and power-up sprites are CC0 assets from OpenGameArt:

- [SpaceShip Boss Set](https://opengameart.org/content/spaceship-boss-set) by The_Scientist___
- [Spaceship Bullet](https://opengameart.org/content/spaceship-bullet) by vergil1018 (CC0)
- [Powerup (Animated Orb)](https://opengameart.org/content/powerup-animated-orb) by jcrown41
