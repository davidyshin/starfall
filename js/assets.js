// Asset loading and one-time game setup.
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
    overdriveReload: loadImage("assets/powerups-v4/spread-shot.png"),
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
  bindFullscreen();
  bindMobileGestureGuards();
  bindOrientationHandling();
}
