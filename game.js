const canvas = document.getElementById("Canvas");
const context = canvas.getContext("2d");

const canvasW = canvas.getBoundingClientRect().width
const canvasH = canvas.getBoundingClientRect().height


var state = -1; // -1 - main, 1 - game, 2 - results

var score = 0;
var highScore = 0;

var isTouchControl = false;

var objects = new Map();
var enemies = new Map();
var boss_instance = null;
var curID = 0;
var evman;
var timerHandle;
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
            timerHandle = setInterval(() => {
                score++;
            }, 500);
            for (let i = 0; i < 40; i++)
                new Star(true);
            new GameObject(healthBar);
            new GameObject(drawScore);
            break;
        case 1:
            state = 2;
            new Button("Retry", canvasW * 0.5, canvasH * (2 / 3), 300, 50, function () {
                if (state === 2) {
                    proceed();
                }
            });
            new GameObject(drawScore);
            clearInterval(timerHandle);
            if (score > highScore) {
                highScore = score;
            }
            enemies.clear();
            boss_instance = null;
            break;
        case 2:
            state = -1;
            score = 0;
            proceed();
            break;
    }
}

function update() { // does the drawing
    context.clearRect(0, 0, canvas.width, canvas.height);
    objects.forEach(d => typeof (d.earlyDraw) == "function" ? d.earlyDraw() : null);
    objects.forEach(d => typeof (d.draw) == "function" ? d.draw() : null);
    objects.forEach(d => typeof (d.update) == "function" ? d.update() : null);
}

class event_manager { // manages random events
    bossTimer = false;
    enemyTimer = false;
    bossTurn = false;
    starTimer = false;

    constructor() {
        this.obstacleTimer = false;
        this.check();
    }

    check() {
        if (state === 1) {
            if (!this.bossTurn) {
                if (!this.obstacleTimer) {
                    this.obstacleTimer = true;
                    setTimeout(() => {
                        this.obstacleTimer = false;
                        if (state === 1)
                            new Obstacle(canvasW, random_range(canvasH * 0.1, canvasH * 0.9));
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
            if (!this.bossTimer) {
                this.bossTimer = true;
                setTimeout(() => {
                    this.bossTimer = false;
                    if (state === 1)
                        new Boss();
                    this.check();
                }, random_range(5000, 20000)); //5000-20000
            }
            if (!this.starTimer) {
                this.starTimer = true;
                setTimeout(() => {
                    this.starTimer = false;
                    if (state === 1)
                        new Star(false);
                    this.check();
                }, random_range(0, 256));
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

    checkCollision(rect) {
        return (rect.x - this.rect.x < this.rect.w && rect.x > this.rect.x) && ((rect.y - this.rect.y) < this.rect.h && rect.y > this.rect.y);
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
                player.takeHit(20);
                if (player.health <= 0) {
                    proceed();
                }
                this.destroy();
            }
        } else {
            enemies.forEach(e => {
                if (e.checkCollision(this.rect)) {
                    e.takeHit();
                    this.destroy();
                }
            });
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
                player.takeHit(10);
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
    cooldown = 200;
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
                context.globalAlpha = 0.5;
                context.drawImage(this.sprite, this.rect.x, this.rect.y, this.rect.w, this.rect.h);
                context.globalAlpha = 1;
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
            canvas.addEventListener('mousemove', (evt) => {
                this.x1 = this.rect.x;
                this.y1 = this.rect.y;
                this.x2 = evt.offsetX - this.rect.w / 2;
                this.y2 = evt.offsetY - this.rect.h / 2;
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
        return !this.invincible && (rect.x - this.rect.x < this.rect.w && rect.x > this.rect.x) && ((rect.y - this.rect.y) < this.rect.h && rect.y > this.rect.y);
    }

    takeHit(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            proceed();
        }
        this.invincible = true;
        setTimeout(() => {
            this.invincible = false;
        }, 2000);
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

    constructor(x, y, w, h) {
        super(x, y, typeof (w) == 'number' ? w : 70, typeof (h) == 'number' ? h : 120, 'game/enemy.png');
        this.count = 0;
        enemies.set(this.id, this);
    }

    update() {
        switch (this.l_state) {
            case 0:
                this.rect.x -= this.speed;
                if (this.rect.x < canvasW * 0.8)
                    this.l_state = 1;
                break;
            case 1:
                this.shoot();
                break;
            case 2:
                this.rect.x += this.speed;
                if (outOfBounds(this.rect)) {
                    this.destroy();
                }
                break;
        }
    }

    shoot() {
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
    }

    takeHit() {
        score += 5;
        if (this.l_state === 1) {
            this.l_state++;
        }
    }

    destroy() {
        super.destroy();
        enemies.delete(this.id);
    }
}

class Boss extends Enemy {
    placing = null;
    up = false;
    health = 100;

    constructor() {
        super(canvasW, canvasH / 2 - canvasH / 4, canvasW / 4, canvasH / 2);
        this.spr.src = "game/boss.png";
        this.speed = 5;
        boss_instance = this;
        this.limit = 2;
    }

    shoot() {
        if (this.up) {
            this.rect.y -= this.speed / 2;
            if (this.rect.y <= 0) {
                this.up = false;
            }
        } else {
            this.rect.y += this.speed / 2;
            if (this.rect.y + this.rect.h * 1.5 >= canvasW) {
                this.up = true;
            }
        }
        if (!this.onCooldown) {
            if (this.placing === null) {
                this.placing = [];
                var cnt = random_range(2, 5);
                for (let i = 0; i < cnt; i++) {
                    this.placing.push(random_range(0, this.rect.y + this.rect.h));
                }
            }
            this.placing.forEach(y => {
                new Bullet(canvasW - 30, y, false, 12);
            });
            this.onCooldown = true;
            setTimeout(() => {
                this.onCooldown = false;
            }, this.cooldown);
            this.count++;
            if (this.count === this.limit) {
                this.placing = null;
                this.count = 0;
            }
        }
    }

    takeHit() {
        if (this.l_state === 1) {
            this.health -= 5;
            if (this.health <= 0) {
                boss_instance = null;
                score += 50;
                this.l_state++;
            }
        }
    }
}

class Star extends GameObject {
    speed = 3;

    constructor(isStart) {
        let type = Math.round(random_range(0, 3));
        let size;
        switch (type) {
            case 0:
                size = 0.4;
                break;
            case 1:
                size = 0.6;
                break;
            case 2:
                size = 0.8;
                break;
            case 3:
                size = 1;
        }
        super(isStart ? random_range(0, canvasW) : canvasW, random_range(0, canvasH), 20 * size, 20 * size, "game/star.png");
        this.type = type;
        this.size = size;
        this.earlyDraw = this.draw;
        this.draw = null;
    }

    update() {
        this.rect.x -= this.speed * this.size
        if (outOfBounds(this.rect)) {
            this.destroy();
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

function healthBar() {
    context.beginPath();
    context.rect(10, 10, player.health, 10);
    context.fillStyle = "#FF0000";
    context.fill();
    context.closePath();
    if (boss_instance != null) {
        context.beginPath();
        context.rect(10, 30, boss_instance.health, 10);
        context.fillStyle = "#005cff";
        context.fill();
        context.closePath();
    }
}

class Button extends GameObject {
    constructor(text, x, y, w, h, onClick) {
        super(function () {
            context.font = "16px Arial";
            context.strokeStyle = "#FFFFFF";
            context.strokeRect(x * this.multipliers.x, y, w, h);
            context.fillText(text, this.multipliers.x*(x + context.measureText(text.length).width * 2), y + (h * (1.8 / 3)), w * (2 / 3))
        });
        this.multipliers = {x: 1, y: 1, w: 1, h: 1}
        const path = new Path2D();
        path.rect(x, y, w, h);
        path.closePath();
        canvas.addEventListener('mousemove', (evt) =>{
            if (context.isPointInPath(path, evt.offsetX, evt.offsetY)) {
                this.multipliers.x = 1.3;
            }else{
                this.multipliers.x = 1;
            }
        }, false);
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