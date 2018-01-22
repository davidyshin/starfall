let base, ship, ship_image, bullets, stars, hp_bar
let gameover = false
let hiscore = 0
let score = 0
let level = 1
let grav = 2
let hp = 100

function setup() {
  stars = new Group();
  bullets = new Group();
  createCanvas(800, 600);
  frameRate(40);
  ship = createSprite(400, 550, 20, 20)
  base = createSprite(400, 589, 800, 20)
  hp_bar = createSprite(400, 11, 800, 20)
  base.shapeColor = color(222, 125, 2)
  hp_bar.shapeColor = color(0, 253, 47)
  for (let i = 0; i < 25; i++) {
    createStar()
  }
}




function draw() {
  if (!gameover) {
    clear()
    background(0)
    textAlign(CENTER);
    fill(255, 255, 255)
    let title_text = text("Starfall", width / 2, 35)
    let hp_text = text(`BASE HP: ${hp}`, width / 2, 50)
    let score_text = text(`Score: ${score}`, 700, 35);
    let hiscore_text = text(`Hi-Score: ${hiscore}`, 700, 50)
    let level_text = text(`LEVEL: ${level}`, 50, 35)
    textAlign(CENTER);
    let control_text = text("Z: Left | X: Right | C: Shoot", width / 2, 65);

    //draw all the sprites added to the sketch so far
    //the positions will be updated automatically at every cycle
    if (keyDown("z")) {
      if (ship.position.x > 50) {
        ship.velocity.x = -27;
      } else {
        ship.velocity.x = 0
      }
    }
    if (keyWentUp("z")) {
      ship.velocity.x = 0;
    }
    //keyDown is similar to keyIsDown() except it accepts both key codes and characters
    if (keyDown("x")) {
      if (ship.position.x < 750) {
        ship.velocity.x = +27;
      } else {
        ship.velocity.x = 0
      }
    }
    if (keyWentUp("x")) {
      ship.velocity.x = 0;
    }

    if (keyWentDown("c")) {
      let bullet = createSprite(ship.position.x, 525, 3, 10);
      bullet.setSpeed(10, ship.rotation - 90);
      bullet.life = 100;
      bullets.add(bullet)
    }

    stars.overlap(bullets, starHit);
    stars.overlap(base, baseHit)

    drawSprites();
  } else {
    textSize(30)
    textAlign(CENTER)
    fill(255, 255, 255)
    text(`GAME OVER`, 400, height / 2)
    text(`Press "P" to play again.`, 400, height / 2 + 50);
    stars.forEach(s => {
      s.remove();
    })
  }
  if (keyWentDown("p") && gameover) {
    hp = 100
    score = 0
    hp_bar.width = 800
    hp_bar.shapeColor = color(0, 253, 47)
    // stars = new Group();
    while (stars.length < 20) {
      createStar();
    }
    gameover = false
  }
  switch (score) {
    case 20:
      level = 2;
      grav = 4;
      break;
    case 40:
      level = 3;
      grav = 5;
      break;
    case 60:
      level = 4;
      grav = 6;
      break;
    case 80:
      level = 5;
      grav = 7;
      break;
    case 100:
      level = 6;
      grav = 8;
      break;
    case 120:
      level = 7;
      grav = 9;
      break;
    case 140:
      level = 8;
      grav = 10;
      break;
    case 160:
      level = 9;
      grav = 11;
      break;
    case 180:
      level = 10;
      grav = 12;
      break;
    case 200:
      level = 11;
      grav = 13;
      break;
  }
  if (score > hiscore) {
    hiscore = score
  }
}

function createStar() {
  let star = createSprite((random(50, 750)),
    (random(-100, -3000)), 30, 30);
  star.addSpeed(grav, 90)
  star.rotationSpeed = 10
  stars.add(star)
}

function baseHit(star) {
  if (hp > 10) {
    hp -= 10
    hp_bar.width -= 80
    if (hp <= 40 && hp >= 20) {
      hp_bar.shapeColor = color(247, 10, 10)
    }
  } else {
    hp = 0
    hp_bar.width = 0
    setTimeout(() => {
      gameover = true
    }, 300)
  }
  star.remove()
}

function starHit(star, bullet) {
  bullet.remove();
  star.remove();
  createStar()
  score += 1
}