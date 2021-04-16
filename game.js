const canvas = document.getElementById("Canvas");
const context = canvas.getContext("2d");

class Drawable {
    constructor(x, y, w, h, param) { //param is either a sprite path or a manual draw func
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        if(typeof (param) == "string"){
            this.manual = false;
            this.spr = param;
        }else{
            this.manual = true;
            this.func = param;
        }
    }

    draw() {
        if (this.manual === true) {
            this.func();
        } else {
            context.drawImage(this.spr,this.x,this.y,this.w,this.h);
        }
    }
}

function update() {
    for (let d in drawables) {
        d.draw();
    }
}

class Player extends Drawable {
    health = 100;

    constructor(x, y, w, h) {
        super(0, 0, 0, 0, null);
    }
}

var drawables = []

drawables.push(new Drawable(0, 0, 0, 0, function () {
    context.beginPath();
    context.rect(10, 10, player.health, 10);
    context.fillStyle = "#FF0000";
    context.fill();
    context.closePath();
}));
player = new Player();
setInterval(update,10);