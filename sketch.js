let base,
  ship,
  bullets,
  stars,
  hp_bar,
  ship_image,
  bullet_image,
  bg_image,
  start_bg,
  star_image,
  particleImage,
  particleImage2,
  particleImage3,
  bullet_sound,
  star_sound,
  basehit_sound,
  start_sound,
  special_sound,
  bgm,
  gameoverbgm,
  startmenu_sound,
  blink_text,
  explosions,
  hearts;
let gameStarted = false;
let gameOver = false;
let paused = false;
let exploded = false;
let specialUsed = false;
let muted = false;
let blink = false;
let hiscore = 0;
let score = 0;
let level = 1;
let grav = 2;
let hp = 100;
let font;

function preload() {
  // preloading images to use for stars, sounds, ship, bullet, animations
  font = loadFont("assets/fonts/2p.ttf");
  ship_image = loadImage("assets/images/ship.png");
  star_image = loadImage("assets/images/star.png");
  heart_image = loadImage("assets/images/heart.png");
  bullet_image = loadImage("assets/images/bullet.png");
  particleImage = loadImage("assets/images/particle.png");
  particleImage2 = loadImage("assets/images/particle2.png");
  particleImage3 = loadImage("assets/images/particle3.png");
  bg_image = loadImage("assets/images/background.png");
  explosion = loadAnimation(
    "assets/explode/explosion_00.png",
    "assets/explode/explosion_35.png"
  );
  start_bg = loadImage("assets/images/startbg.png");
  soundFormats("wav", "ogg");
  start_sound = loadSound("assets/sounds/start.wav");
  gameover_sound = loadSound("assets/sounds/gameover.wav");
  bullet_sound = loadSound("assets/sounds/laser.wav");
  starhit_sound = loadSound("assets/sounds/starhit.wav");
  basehit_sound = loadSound("assets/sounds/basehit.wav");
  life_sound = loadSound("assets/sounds/life.wav");
  special_sound = loadSound("assets/sounds/special.wav");
  pause_sound = loadSound("assets/sounds/pause.wav");
  gameoverbgm = loadSound("assets/sounds/gameoverbgm.ogg");
  startmenu_sound = loadSound("assets/sounds/startmenu.wav");
  bgm = loadSound("assets/sounds/bgm.ogg");
}

function setup() {
  textFont(font);
  stars = new Group();
  bullets = new Group();
  explosions = new Group();
  hearts = new Group();
  specials = new Group();
  createCanvas(800, 600);
  frameRate(40);
  ship = createSprite(width / 2, height * 0.93, 20, 20);
  ship.addImage(ship_image);
  base = createSprite(width / 2, height * 0.985, 800, 20);
  hp_bar = createSprite(width / 2, height * 0.013, width, 20);
  base.shapeColor = color(0);
  hp_bar.shapeColor = color(0, 253, 47);
  ship.shapeColor = color(255, 255, 255);
  masterVolume(1);
  // starts startmenu bgm
  startmenu_sound.loop();
}

function draw() {
  // before game starts, requires a space click or mouse left click"
  if (!gameStarted) {
    clear();
    background(start_bg);
    textAlign(CENTER);
    fill(255, 255, 255);
    textSize(20);
    text(`Welcome to Starfall.`, width / 2, height / 2.5);
    text(
      `Protect your city
from the falling stars.`,
      width / 2,
      height / 2.1
    );
    if (!blink) {
      blink_text = text(
        `Press "Space" or Click to start.`,
        width / 2,
        height / 1.7
      );
    } else {
      blink_text = text("");
    }
    if (keyWentDown("space") || mouseWentDown(LEFT)) {
      // little beep sound plays when space or left click
      start_sound.play();
      // stops startmenu bgm
      startmenu_sound.stop();
      // starts regular game bgm
      bgm.loop();
      gameStarted = true;
    }
  }
  if (!gameOver && gameStarted) {
    // if gameover is false/gamestarted is true
    // game renders normally
    while (stars.length <= 25) {
      createStar();
    }
    clear();
    hp_bar.width = hp * 8;
    background(bg_image);
    textAlign(CENTER);
    fill(255, 255, 255);
    // Game display texts
    textSize(15);
    textStyle("BOLD");
    let title_text = text("Starfall", width / 2, 45);
    textSize(10);
    let hp_text = text(`CITY HP: ${hp}`, width / 2, 65);
    let score_text = text(`Score: ${score}`, 730, 55);
    let hiscore_text = text(`Hi-Score: ${hiscore}`, 730, 70);
    let level_text = text(`Level: ${level}`, 70, 55);
    // NEED TO FIX THIS
    let control_text = text(
      `← Move Left | Move Right →
Z : Shoot | X : Special | P : Pause | M : Mute Sound`,
      width / 2,
      80
    );
    let special_text = text(`Special: ${specialUsed ? "No" : "Yes"}`, 70, 70);
    //draw all the sprites added to the sketch so far
    //the positions will be updated automatically at every cycle
    if (ship.position.x < 50 || ship.position.x > 750) {
      ship.setSpeed(0, 0);
    }
    if (keyDown("left")) {
      if (ship.position.x > 50) {
        ship.setSpeed(25, 180);
      }
    }

    if (keyWentUp("left")) {
      if (ship.position.x > 50) {
        ship.setSpeed(1.5, 180);
      }
    }
    //keyDown is similar to keyIsDown() except it accepts both key codes and characters
    if (keyDown("right")) {
      if (ship.position.x < 750) {
        ship.setSpeed(25, 0);
      }
    }
    if (keyWentUp("right")) {
      if (ship.position.x < 750) {
        ship.setSpeed(1.5, 0);
      }
    }

    if (keyWentDown("z")) {
      let bullet = createSprite(
        ship.position.x,
        ship.position.y * 0.985,
        8,
        18
      );
      bullet.addImage(bullet_image);
      bullet.setSpeed(10, 270);
      bullet.life = 52;
      bullets.add(bullet);
      bullet_sound.setVolume(0.6);
      bullet_sound.play();
    }

    if (keyWentDown("x")) {
      console.log("special");
      if (!specialUsed) {
        let special = createSprite(width / 2, ship.position.y, 800, 1.5);
        special.addSpeed(9, 270);
        special.life = 70;
        specials.add(special);
        special_sound.play();
        specialUsed = true
      }
      setTimeout(() => {
        specialUsed = false;
      }, 30000);
    }

    // if any stars "ovelap" any bullets, invokes starHit
    /// function which removes star (line 228)
    bullets.overlap(stars, starHit);
    // if any stars "overlap" or "hit" base, invokes baseHit function
    // which minuses 10hp
    stars.overlap(base, baseHit);
    hearts.overlap(ship, heartHit);
    specials.overlap(stars, specialHit);
  } else if (gameOver) {
    clear();
    // when gameover (hp reaches 0) is true below will render
    textSize(30);
    background(bg_image);
    textAlign(CENTER);
    fill(255, 255, 255);
    text(`Your Score:${score}`, width / 2, height / 2 - 70);
    text("GAME OVER", width / 2, height / 2 - 100);
    if (!blink) {
      blink_text = text('Press "R" to play again.', width / 2, height / 2 - 30);
    } else {
      blink_text = text("");
    }
    if (!exploded) {
      let g = createSprite(width / 2, height / 2, 50, 50);
      g.addAnimation("explosion", explosion);
      explosions.add(g);
      setTimeout(() => {
        g.remove();
      }, 3000);
      exploded = true;
    }

    stars.forEach(s => {
      s.remove();
    });
  }
  // if gamesover and "r" is clicked, game is reset
  // hp 100, score 0, 25 more stars
  if (keyWentDown("r") && gameOver) {
    gameoverbgm.stop();
    bgm.loop();
    explosions.forEach(s => {
      s.remove();
    });
    clear();
    hp = 100;
    hp_bar.width = hp * 8;
    hp_bar.shapeColor = color(0, 253, 47);
    score = 0;
    level = 1;
    grav = 2;
    ship.position.x = width / 2;
    gameOver = false;
    exploded = false;
  }
  drawSprites();
  // Levels 1-15 determined by score
  switch (score) {
    case 20:
      level = 2;
      grav = 2.5;
      setTimeout(createHeart, 300);
      break;
    case 60:
      level = 3;
      grav = 4;
      setTimeout(createHeart, 300);
      break;
    case 120:
      level = 4;
      grav = 5.5;
      setTimeout(createHeart, 300);
      break;
    case 300:
      level = 5;
      grav = 6;
      setTimeout(createHeart, 300);
      break;
    case 420:
      level = 6;
      grav = 6.5;
      setTimeout(createHeart, 300);
      break;
    case 560:
      level = 7;
      grav = 7;
      setTimeout(createHeart, 300);
      break;
    case 800:
      level = 8;
      grav = 7.5;
      setTimeout(createHeart, 300);
      break;
    case 1000:
      level = 9;
      grav = 8;
      setTimeout(createHeart, 300);
      break;
    case 1300:
      level = 10;
      grav = 8.5;
      setTimeout(createHeart, 300);
      break;
    case 1600:
      level = 11;
      grav = 9;
      setTimeout(createHeart, 300);
      break;
    case 1900:
      level = 12;
      grav = 9.5;
      setTimeout(createHeart, 300);
      break;
    case 2200:
      level = 13;
      grav = 10;
      setTimeout(createHeart, 300);
      break;
    case 2800:
      level = 14;
      grav = 10.5;
      setTimeout(createHeart, 300);
      break;
    case 3300:
      level = 15;
      grav = 11;
      setTimeout(createHeart, 300);
      break;
  }
  // if score which starts at 0 is higher than current hiscore, redeclares hiscore
  if (score > hiscore) {
    hiscore = score;
  }
}
// creates star in y position -100 (-100 is above the canvas, so it prerenders
// and falls into the canvas) between x positions 50-750
// stars fall with speed according to gravity

function createStar() {
  let star = createSprite(random(50, 750), random(-100, -3000), 50, 50);
  star.addSpeed(grav, 90);
  star.rotationSpeed = 2.5;
  stars.add(star);
  star.addImage(star_image);
}

// creates heart in y position -200,
// starts fall with consistent gravity ( pretty quick )
// will be used in the future as a power up (replenish life)
function createHeart() {
  if (hearts.length < 1) {
    let heart = createSprite(random(50, 750), -200, 20, 20);
    heart.addImage(heart_image);
    heart.setSpeed(10, 90);
    heart.life = 90;
    hearts.add(heart);
    score += 1;
  }
}

// function to be invoked when ship and upgrade collides
function heartHit(heart) {
  hp = 100;
  hp_bar.width = hp * 8;
  hp_bar.shapeColor = color(0, 253, 47);
  life_sound.play();
  heart.remove();
}

// if the base platform is hit hp is minused 10
// hp_bar sprite (rectangle with width of 800) loses 80 width (10% of 800)
function baseHit(star) {
  if (hp > 10) {
    hp -= 10;
    if (hp <= 50 && hp >= 30) {
      hp_bar.shapeColor = color(255, 156, 0);
    } else if (hp <= 30 && hp >= 10) {
      hp_bar.shapeColor = color(247, 10, 10);
    }
  } else {
    hp = 0;
    hp_bar.width = 0;
  }
  basehit_sound.play();
  if (hp < 10) {
    // explosion sound effect
    gameover_sound.play();
    gameOver = true;
    // stops regular bgm
    bgm.stop();
    // starts gameover bgm for gameover screen
    gameoverbgm.loop();
  }
  // e.life = 50
  // e.addAnimation("explode", explosion)
  // creates 35 particles on basehit (particleimage1,2,3 red,yellow,white circles)
  for (let i = 0; i < 35; i++) {
    let e = createSprite(star.position.x, star.position.y + 20);
    if (i % 3 === 0) {
      e.addImage(particleImage);
    } else if (i % 2 === 0) {
      e.addImage(particleImage2);
    } else {
      e.addImage(particleImage3);
    }
    e.setSpeed(random(2, 5), random(90, 360));
    e.friction = 0.05;
    e.life = 30;
  }
  star.remove();
}

// function used for "special move" 800px width line goes up screen,
// every star hit will create particle effects, however the special line does not disappear
// until life runs out
function specialHit(special, star) {
  star.remove();
  score += 1;
  starhit_sound.play();
  for (let i = 0; i < 15; i++) {
    let p = createSprite(star.position.x, star.position.y);
    if (i % 2 === 0) {
      p.addImage(particleImage);
    } else {
      p.addImage(particleImage2);
    }
    p.setSpeed(random(3, 5), random(0, 360));
    p.life = 18;
    p.friction = 0.1;
  }
}

// function run to remove star and create particle explosion effect
function starHit(star, bullet) {
  star.remove();
  starhit_sound.play();
  for (let i = 0; i < 15; i++) {
    let p = createSprite(star.position.x, star.position.y);
    if (i % 2 === 0) {
      p.addImage(particleImage);
    } else {
      p.addImage(particleImage2);
    }
    p.setSpeed(random(3, 5), random(0, 360));
    p.life = 18;
    p.friction = 0.1;
  }
  score += 1;
  bullet.remove();
}
// used to implement blinking text. every 500ms blink goes from true to false,
// text will render depending on this
setInterval(() => {
  blink = !blink;
}, 500);

function keyPressed() {
  // keyCode === "p"
  if (keyCode === 80) {
    // pause game function
    paused = !paused;
    if (paused && gameStarted) {
      noLoop();
    } else {
      loop();
    }
    // plays a little beep everytime game is paused
    pause_sound.play();
    // keyCode === "m"
  } else if (keyCode === 77) {
    // mutes game
    if (!muted) {
      masterVolume(0);
    } else {
      masterVolume(1);
    }
    muted = !muted;
  }
}
