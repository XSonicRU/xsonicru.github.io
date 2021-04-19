const canvas = document.getElementById("Canvas");
const context = canvas.getContext("2d");

const canvasW = canvas.getBoundingClientRect().width
const canvasH = canvas.getBoundingClientRect().height


var state = -1; // -1 - main, 1 - game, 2 - results

var score = 0;
var highScore = 0;

var isTouchControl = false;

var objects = new Map();
var curID = 0;
var evman;
var player;

function proceed() { // init func for buttons and game start/finish
    objects.clear();
    switch (state) {
        case -1:
            state = 0;
            new GameObject(drawScore);
            new Button("Movement Control", canvasW * (1 / 4), canvasH * (2 / 5), 300, 50, function () {
                if (state === 0) {
                    isTouchControl = false;
                    proceed();
                }
            });
            new Button("Touch Control", canvasW * (1 / 4), canvasH * (2 / 3), 300, 50, function () {
                if (state === 0) {
                    isTouchControl = true;
                    proceed();
                }
            });
            break;
        case 0:
            state = 1;
            evman = new event_manager();
            player = new Player();
            new GameObject(function () {
                context.beginPath();
                context.rect(10, 10, player.health, 10);
                context.fillStyle = "#FF0000";
                context.fill();
                context.closePath();
            });
            new GameObject(drawScore);
            break;
        case 1:
            state = 2;
            break;
    }
}

function update() { // does the drawing
    context.clearRect(0, 0, canvas.width, canvas.height);
    objects.forEach(d => d.draw());
    objects.forEach(d => typeof (d.update) == "function" ? d.update() : null);
}

class event_manager { // manages random events
    bossTimer = false;
    enemyTimer = false;

    constructor() {
        this.obstacleTimer = false;
        this.check();
    }

    check() {
        if (state === 1) {
            if (!this.obstacleTimer) {
                this.obstacleTimer = true;
                setTimeout(() => {
                    this.obstacleTimer = false;
                    if (state === 1) {
                        new Obstacle(canvasW, random_range(canvasH * 0.1, canvasH * 0.9));
                    }
                    this.check();
                }, random_range(300, 900));
            }
            if (!this.enemyTimer) {
                this.enemyTimer = true;
                setTimeout(() => {
                    this.enemyTimer = false;
                    if (state === 1) {
                        var cnt = random_range(1, 5);
                        for (let i = 0; i < cnt; i++) {
                            new Enemy(canvasW, random_range(canvasH * 0.1, canvasH * 0.9));
                        }
                    }
                    this.check();
                }, random_range(2000, 7000));
            }
        }
    }
}

class GameObject { // general class for all drawable objects
    destroyed = false;

    constructor(x, y, w, h, spr) { //x is either an x or a manual draw func
        this.id = curID;
        curID++;
        objects.set(this.id, this);
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

    destroy() {
        this.destroyed = true;
        objects.delete(this.id);
    }
}

class Bullet extends GameObject {

    constructor(x, y, type, speed) { //type=true - good bullet, false - bad bullet
        super(x, y, canvasW / 20, canvasH / 40, type ? "game/bullet.png" : "game/enemy_bullet.png");
        this.type = type;
        this.speed = speed;
    }

    update() {
        if (!this.type) {
            if (player.checkCollision(this.rect)) {
                player.health -= 40;
                if (player.health <= 0) {
                    proceed();
                }
            }
        }
        if (outOfBounds(this.rect))
            this.destroy();
        this.rect.x = this.type ? this.rect.x + this.speed : this.rect.x - this.speed;
    }
}

class Obstacle extends GameObject {
    speed = 8;

    constructor(x, y) {
        super(x, y, 40, 20, "game/meteor.png");
    }

    update() {
        this.rect.x -= this.speed;
        if (outOfBounds(this.rect))
            this.destroy()
        if (!this.destroyed) {
            if (player.checkCollision(this.rect)) {
                player.health -= 20;
                if (player.health <= 0) {
                    proceed();
                }
                this.destroy();
            }
        }
    }
}

class Player extends GameObject {
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
        this.draw = () => {
            if (!this.invincible) {
                context.drawImage(this.sprite, this.rect.x, this.rect.y, this.rect.w, this.rect.h);
            } else {

            }
        }
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

            document.addEventListener('keydown', keyEvent);
            document.addEventListener('keyup', keyEvent);
        } else {
            canvas.addEventListener('click', (evt) => {
                this.x1 = this.rect.x;
                this.y1 = this.rect.y;
                this.x2 = evt.offsetX;
                this.y2 = evt.offsetY;
                var dx = this.x2 - this.x1;
                var dy = this.y2 - this.y1;
                this.dist = Math.abs(Math.sqrt(dx * dx + dy * dy));
                this.s_speed = this.speed / this.dist;
                this.m_prog = 0;
            }, false);
            this.move_states.shoot = true;
        }
    }

    checkCollision(rect) {
        return (rect.x - this.rect.x < this.rect.w && rect.x > this.rect.x) && ((rect.y - this.rect.y) < this.rect.h && rect.y > this.rect.y);
    }

    update() {
        if (this.move_states.shoot) {
            if (!this.onCooldown) {
                new Bullet(this.rect.x + this.rect.w / 2, this.rect.y + this.rect.h / 2 - canvasH / 80, true, 10);
                this.onCooldown = true;
                setTimeout(() => {
                    this.onCooldown = false;
                }, this.cooldown)
            }
        }
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
        } else {
            if (Math.abs(this.x2 - this.rect.x) > this.speed || Math.abs(this.y2 - this.rect.y) > this.speed) {
                this.m_prog += this.s_speed;
                this.rect.x = this.x1 + (this.x2 - this.x1) * this.m_prog;
                this.rect.y = this.y1 + (this.y2 - this.y1) * this.m_prog;
            }
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
class Enemy extends GameObject {
    speed = 10;
    limit = 3; //how many bullets will be fired before falling back
    onCooldown = false;
    cooldown = 1000;
    l_state = 0; // 0 - moving to the spot, 1 - firing, 2 - falling back

    constructor(x, y) {
        super(x, y, 70, 120, 'game/enemy.png');
        this.count = 0;
    }

    update() {
        switch (this.l_state) {
            case 0:
                this.rect.x -= this.speed;
                if (this.rect.x < canvasW * 0.8)
                    this.l_state = 1;
                break;
            case 1:
                if (!this.onCooldown) {
                    new Bullet(this.rect.x + this.rect.w / 2, this.rect.y + this.rect.h / 2 - canvasH / 80, false, 10);
                    this.onCooldown = true;
                    this.count++;
                    if (this.count === this.limit) {
                        this.l_state = 2;
                        return;
                    }
                    setTimeout(() => {
                        this.onCooldown = false;
                    }, this.cooldown)
                }
                break;
            case 2:
                this.rect.x += this.speed;
                if (outOfBounds(this.rect)) {
                    this.destroy();
                }
                break;
        }
    }
}

function drawScore() {
    context.font = "16px Arial";
    context.fillStyle = "#FFFFFF";
    if (state === 1) {
        context.fillText("Highscore:" + highScore + "            " + "Score:" + score, canvasW * (1 / 2), 20, canvasW / 3);
    } else {
        context.fillText("Highscore:" + highScore, canvasW * (2 / 3), 22, canvasW / 3);
    }
}

class Button extends GameObject {
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

function random_range(low, high) {
    return low + Math.random() * (high - low);
}

function outOfBounds(rect) {
    return rect.x > canvasW || rect.x < -rect.w;
}

proceed();
setInterval(update, 16); //updating at 60fps