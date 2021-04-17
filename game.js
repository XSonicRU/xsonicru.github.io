const canvas = document.getElementById("Canvas");
const context = canvas.getContext("2d");

const canvasW = canvas.getBoundingClientRect().width
const canvasH = canvas.getBoundingClientRect().height

var isTouchControl = false; //false - kb/mouse, true - touch

var state = -1; // -1 - pre-init, 0 - main, 1 - game, 2 - results

var score = 0;
var highScore = 0;

var objects = []

function proceed() {
    switch (state) {
        case -1:
            objects.push(new Drawable(drawScore));
            objects.push(new Button("Movement Control", canvasW * (1 / 4), canvasH * (2 / 5), 300, 50, function () {
                isTouchControl = false;
                proceed();
            }));
            objects.push(new Button("Touch Control", canvasW * (1 / 4), canvasH * (2 / 3), 300, 50, function () {
                isTouchControl = true;
                proceed();
            }));
            state = 0;
            break;
        case 0:
            objects.length = 0;
            const player = new Player();
            objects.push(player);
            state = 1;
            objects.push(new Drawable(function () {
                context.rect(10, 10, player.health, 10);
                context.fillStyle = "#FF0000";
                context.fill();
            }))
            objects.push(new Drawable(drawScore))
            break;
        case 2:
            break;
    }
}

function update() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    objects.forEach(d => d.draw());
    objects.forEach(d => typeof (d.update) == "function" ? d.update() : null);
}

class Drawable {
    constructor(x, y, w, h, spr) { //x is either an x or a manual draw func
        if (typeof (x) == "number") {
            this.spr = new Image();
            this.spr.src = spr;
            this.rect = {x: x, y: y, w: w, h: h}
        } else {
            this.draw = x;
        }
    }

    draw() {
        context.drawImage(this.spr, this.rect.x, this.rect.y, this.rect.w, this.rect.h);
    }
}

class Bullet extends Drawable {

    constructor(x, y, type, speed) { //type=true - good bullet, false - bad bullet
        super(x, y, canvasW / 20, canvasH / 40, "game/bullet.png");
        this.type = type;
        this.speed = speed;
    }

    update() {
        this.rect.x = this.type ? this.rect.x + this.speed : this.rect.x - this.speed;
    }
}

class Player extends Drawable {
    health = 100;
    invincible = false;
    speed = 5;
    onCooldown = false;
    cooldown = 300;
    move_states = {left: false, up: false, right: false, down: false, shoot: false};


    constructor() {
        super(null) //idiotic
        this.sprite = new Image();
        this.sprite.src = "game/spaceship.png";
        this.rect = {x: canvasW / 5, y: canvasH / 2, w: canvasW / 10, h: canvasH / 15};
        if (!isTouchControl) {
            const keyEvent = (event) => {
                switch (event.key) {
                    case "ArrowLeft":
                        this.move_states.left = event.type === "keydown";
                        break;
                    case "ArrowUp":
                        this.move_states.up = event.type === "keydown";
                        break;
                    case "ArrowRight":
                        this.move_states.right = event.type === "keydown";
                        break;
                    case "ArrowDown":
                        this.move_states.down = event.type === "keydown";
                        break;
                    case "Control":
                        this.move_states.shoot = event.type === "keydown";
                        break;
                }
            };

            this.draw = () => {
                if (!this.invincible) {
                    context.drawImage(this.sprite, this.rect.x, this.rect.y, this.rect.w, this.rect.h);
                } else {

                }
            }

            document.addEventListener('keydown', keyEvent);
            document.addEventListener('keyup', keyEvent);
        } else {
            this.move_states.shoot = true;
        }
    }

    update() {
        if (!isTouchControl) {
            if (this.move_states.left) {
                this.rect.x -= this.speed;
            }
            if (this.move_states.up) {
                this.rect.y -= this.speed;
            }
            if (this.move_states.right) {
                this.rect.x += this.speed;
            }
            if (this.move_states.down) {
                this.rect.y += this.speed;
            }
            if (this.move_states.shoot) {
                if (!this.onCooldown) {
                    objects.push(new Bullet(this.rect.x, this.rect.y + this.rect.h / 2 - canvasH / 80, true, 10));
                    this.onCooldown = true;
                    setTimeout(() => {
                        this.onCooldown = false;
                    }, this.cooldown)
                }
            }
        } else {

        }
        if (this.rect.x < 0) {
            this.rect.x = 0;
        } else if (this.rect.x > (canvasW - this.rect.w)) {
            this.rect.x = (canvasW - this.rect.w);
        } else if (this.rect.y < 0) {
            this.rect.y = 0;
        } else if (this.rect.y > (canvasH - this.rect.h)) {
            this.rect.y = (canvasH - this.rect.h);
        }
    }
}

/*if( /Android|webOS|iPhone|iPad|Mac|Macintosh|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    // some code..
}*/

function drawScore() {
    context.font = "16px Arial";
    context.fillStyle = "#FFFFFF";
    if (state === 1) {
        context.fillText("Highscore:" + highScore + "            " + "Score:" + score, canvasW * (1 / 2), 20, canvasW / 3);
    } else {
        context.fillText("Highscore:" + highScore, canvasW * (2 / 3), 22, canvasW / 3);
    }
}

class Button extends Drawable {
    constructor(text, x, y, w, h, onClick) {
        super(function () {
            context.font = "16px Arial";
            context.strokeStyle = "#FFFFFF";
            context.strokeRect(x * this.multipliers.x, y, w, h);
            context.fillText(text, x + context.measureText(text.length).width * 2, y + (h * (1.8 / 3)), w * (2 / 3))
        });
        this.multipliers = {x: 1, y: 1, w: 1, h: 1}
        const path = new Path2D();
        path.rect(x, y, w, h);
        path.closePath();

        canvas.addEventListener('click', function (evt) {
            if (context.isPointInPath(path, evt.offsetX, evt.offsetY)) {
                onClick();
            }
        }, false);
    }
}

proceed();
setInterval(update, 16);