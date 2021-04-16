const canvas = document.getElementById("Canvas");
const context = canvas.getContext("2d");

const canvasW = canvas.getBoundingClientRect().width
const canvasH = canvas.getBoundingClientRect().height

var control = false;

var state = 0; //0 - main, 1 - game, 2 - results

var score = 0;
var highscore = 0;

class Drawable {
    constructor(x, y, w, h, spr) { //x is either an x or a manual draw func
        if (typeof (x) == "number") {
            this.manual = false;
            this.spr = spr;
            this.rect = {x: x, y: y, w: w, h: h}
        } else {
            this.manual = true;
            this.func = x;
        }
    }

    draw() {
        if (this.manual === true) {
            this.func();
        } else {
            context.drawImage(this.spr, this.rect.x, this.rect.y, this.rect.w, this.rect.h);
        }
    }
}

function update() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawables.forEach(d => d.draw());
}

class Player extends Drawable {
    health = 100;

    constructor(x, y, w, h) {
        super(0, 0, 0, 0, null);
    }
}

var drawables = []

/*if( /Android|webOS|iPhone|iPad|Mac|Macintosh|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    // some code..
}*/

function drawScore() {
    context.font = "16px Arial";
    context.fillStyle = "#FFFFFF";
    if (state === 1) {
        context.fillText("Highscore:" + highscore + "\t\t\t\t\t\t\t\t\tScore:" + score, canvasW * (1 / 2), 20, canvasW / 3);
    } else {
        context.fillText("Highscore:" + highscore, canvasW * (2 / 3), 22, canvasW / 3);
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

function proceed() {
    if (state === 0) {
        state = 1;
        drawables.length = 0;
        drawables.push(new Drawable(function () {
            //context.rect(10, 10, player.health, 10);
            context.rect(10, 10, 100, 10);
            context.fillStyle = "#FF0000";
            context.fill();
        }))
        drawables.push(drawables.push(new Drawable(drawScore)))
    } else if (state === 2) {
        state = 0;
    }
}

drawables.push(new Drawable(drawScore));
drawables.push(new Button("Movement Control", canvasW * (1 / 4), canvasH * (2 / 5), 300, 50, function () {
    control = false;
    proceed();
}));
drawables.push(new Button("Touch Control", canvasW * (1 / 4), canvasH * (2 / 3), 300, 50, function () {
    control = true;
    proceed();
}));

setInterval(update, 10);