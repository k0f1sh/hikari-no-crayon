// Hikari no Crayon

var canvas, c, width, height, count = 0, pre_canvas, pre_c;
var mouse = {x: null, y:null};
var effects = [];

var is_down = false;
var is_rainbow_mode = false;
var is_fade_mode = false;
var is_auto_mode = false;

var MARGIN = 40;
var TOOLBOX_WIDTH = 300;

var pen_tools, pen_tool;
var pen_size = 30;
var pen_color = HSVtoRGB(200, 200, 200);

onload = function() {

    // from http://blog.mach3.jp/2012/07/31/graphical-togglebutton-by-radio-input.html
    $.fn.extend({
        toggleButtons : function(callback){
            var radios = this;
            radios.on("change", function(e){
                radios.closest("label").removeClass("selected");
                $(e.target).closest("label").addClass("selected");
                callback.call(this, e);
            });
            radios.closest("label").on("click", function(e){
                var input = $(this).find("input");
                if(! input.prop("checked")){
                    input.prop("checked", true).trigger("change");
                }
            });
            radios.filter(":checked").trigger("change");
        }
    });

    
    init();
    mainLoop();
};

function init() {



    width = window.innerWidth - TOOLBOX_WIDTH;
    height = window.innerHeight;
    canvas = document.getElementById('canvas');
    canvas.width = width;
    canvas.height = height;
    c = canvas.getContext('2d');

    pre_canvas = document.getElementById('pre');
    pre_canvas.width = 300;
    pre_canvas.height = 50;
    pre_c = pre_canvas.getContext('2d');

    clear(c);
    clear(pre_c);

    pen_tools = {
        'normal_pen' : new NormalPen(),
        'blood_pen' : new BloodPen(),
        'fur_pen' : new FurPen(),
        'snow_pen' : new SnowPen(),
        'collatz_pen' : new CollatzPen(),
        'hoshi_pen' : new HoshiPen(),
        'hane_pen' : new HanePen(),
        'yami_pen' : new YamiPen(),
        'nami_pen' : new NamiPen(),
        'spray_pen' : new SprayPen(),
        'bubble_pen' : new BubblePen(),
        'degi_pen' : new DegiPen(),
    };

    pen_tool = pen_tools['normal_pen'];


    // pen select
    $("input[name=pen]").toggleButtons(function(e){
        pen_tool = pen_tools[e.target.value];

    });

    // slider
    $('#size_slider').slider({min:4, max:200, value:30});
    $('#size_slider').on("slide", function (e) {
        pen_size = $('#size_slider').val();
        updatePreCanvas();
    });

    $('#color_slider').slider({min:0, max:359, value:200});
    $('#color_slider').on("slide", function (e) {
        pen_color = HSVtoRGB($('#color_slider').val(), 200, 200);
        updatePreCanvas()
    });

    // events

    $('#rainbow_mode').on("change", function () {
        is_rainbow_mode = $(this).prop('checked');
    });

    $('#auto_mode').on("change", function () {
        is_auto_mode = $(this).prop('checked');
    });

    $('#fade_mode').on("change", function () {
        is_fade_mode = $(this).prop('checked');
    });

    $('#clear_button').on("click", function () {
        clear(c);
        effects = [];
    });

     $('#canvas').on("mousemove", function (e) {
        getMousePos(e);
        c.globalCompositeOperation = "lighter";

        if (is_down) {
            pen_tool.draw(mouse.x, mouse.y);
        }

    });

    $('#canvas').on("touchmove", function (e) {
        e.preventDefault();
        getTouchPos(e);
        
        pen_tool.draw(mouse.x, mouse.y);
    });

    $('#canvas').on("touchstart", function (e) {
        is_down = true;
        getTouchPos(e);
        pen_tool.draw(mouse.x, mouse.y);

    });

    $('#canvas').on("touchend", function (e) {
        is_down = false;
        
    });
    
    $('#canvas').on("mouseout", function (e) {
        mouse.x = "none";
        mouse.y = "none";
    });
    $('#canvas').on("mousedown", function (e) {
        getMousePos(e);
        is_down = true;
        pen_tool.draw(mouse.x, mouse.y);

    });
    $('#canvas').on("mouseup", function (e) {
        is_down = false;
        
    });

    c.globalCompositeOperation = "lighter";
}

function updatePreCanvas() {
    clear(pre_c);
    drawPreCircle(150, 25, pen_size, pen_color);
}

function mainLoop() {
    count += 1;
    if (is_fade_mode) {
        c.globalCompositeOperation = "source-over";
        c.fillStyle = color2str({r:0, g:0, b:0}, 0.05);
        c.fillRect(0, 0, width, height);
        c.globalCompositeOperation = "lighter";
    }

    if (is_auto_mode) {
        pen_tool.draw(Math.floor(Math.random() * width), Math.floor(Math.random() * height), pen_color);
    }

    if (is_rainbow_mode) {
        pen_color = HSVtoRGB(count % 60 * 6, 200, 200);
    }

    _.each(effects, function (e) {
		e.move();
		e.render();
	}, this);
    
	effects = _.filter(effects, function (e) {return e.del_flg == false;});

    updatePreCanvas();

	setTimeout(arguments.callee, 1000 / 30);
}


function getMousePos(e) {
    mouse.x = e.pageX;
    mouse.y = e.pageY;
    return mouse;
};

function getTouchPos(e) {
    var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
    mouse.x = touch.pageX;
    mouse.y = touch.pageY;
    return mouse;
};

function clear(c) {
    c.globalCompositeOperation = "source-over";
    c.fillStyle = "#000000";
    c.fillRect(0, 0, width, height);
    c.globalCompositeOperation = "lighter";
}

function drawCircle(x, y, r, color, p, q) {
    var grad  = c.createRadialGradient(x, y, 1, x, y, r);
    grad.addColorStop(p, color2str(color, 0.7));
    grad.addColorStop(q, 'rgba(0, 0, 0, 0)');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI*2, false);
    c.fill();
    c.closePath();
}

function drawPreCircle(x, y, r, color) {
    var grad  = pre_c.createRadialGradient(x, y, 1, x, y, r);
    grad.addColorStop(0.1, color2str(color, 1));
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    pre_c.fillStyle = grad;
    pre_c.beginPath();
    pre_c.arc(x, y, r, 0, Math.PI*2, false);
    pre_c.fill();
    pre_c.closePath();
}

function drawTriangle(pos1, pos2, pos3, color, a) {
    c.fillStyle = color2str(color, a);
    c.beginPath();
    c.moveTo(pos1.x, pos1.y);
    c.lineTo(pos2.x, pos2.y);
    c.lineTo(pos3.x, pos3.y);
    c.closePath();

    c.fill();
}

function drawPoint(x, y, color, a) {
    c.fillStyle = color2str(color, a);
    c.fillRect(x, y, 1, 1);
    c.closePath();
}

function color2str(color, a) {
    return 'rgba(' + Math.floor(color.r) + ',' + Math.floor(color.g) + ',' + Math.floor(color.b) + ',' + a + ')';
}

function HSVtoRGB(h, s, v) {
    var r, g, b;
    while (h < 0) {
        h += 360;
    }
    h = h % 360;
    if (s == 0) {
        v = Math.round(v);
        return {'r': v, 'g': v, 'b': v};
    }
    s = s / 255;
    var i = Math.floor(h / 60) % 6,
    f = (h / 60) - i,
    p = v * (1 - s),
    q = v * (1 - f * s),
    t = v * (1 - (1 - f) * s)
    switch (i) {
    case 0 :
        r = v;  g = t;  b = p;  break;
    case 1 :
        r = q;  g = v;  b = p;  break;
    case 2 :
        r = p;  g = v;  b = t;  break;
    case 3 :
        r = p;  g = q;  b = v;  break;
    case 4 :
        r = t;  g = p;  b = v;  break;
    case 5 :
        r = v;  g = p;  b = q;  break;
    }
    return {'r': Math.round(r), 'g': Math.round(g), 'b': Math.round(b)};
}


// util

function movePos(pos, spd, d) {
	var sx = Math.cos(d2r(d)) * spd;
	var sy = Math.sin(d2r(d)) * spd;

	return {
		x : pos.x + sx,
		y : pos.y + sy,
	};
}

function d2r(d) {
	return d * Math.PI / 180;
}

function drawLines(pos_list, color, a, size) {
    var l = pos_list.length;
    if (2 > l) {
        return;
    }

    for (var i = 1; i < l; i++) {
        var spos = pos_list[i - 1];
        var epos = pos_list[i];
        drawLineColor(spos, epos, color, a, size);
    }
}

function drawLineColor(spos, epos, color, a, size) {
    c.strokeStyle = color2str(color, a);
    c.lineWidth = size;
	c.beginPath();
	c.moveTo(spos.x, spos.y);
	c.lineTo(epos.x, epos.y);
	c.stroke();
}


// pens

// NormalPen
var NormalPen = function () {};
NormalPen.prototype = {
	draw : function (x, y) {
        drawCircle(x, y, pen_size, pen_color, 0.1, 1.0);
	},
}

// BloodPen
var BloodPen = function () {};
BloodPen.prototype = {
	draw : function (x, y) {
        effects.push(new BloodObj(x, y, pen_color));
	},
}

// FurPen
var FurPen = function () {};
FurPen.prototype = {
	draw : function (x, y) {
        _(120).times(function (n) {
            var d = n + Math.floor(Math.random() * 10) + (count % 100);
            var ox = x + Math.floor(Math.random() * 20) - 10;
            var oy = y + Math.floor(Math.random() * 20) - 10;
            var to_x = x + (Math.cos(d2r(n * 3)) * pen_size) * Math.random();
            var to_y = y + (Math.sin(d2r(n * 3)) * pen_size) * Math.random();

            drawLineColor({x:ox, y:oy}, {x:to_x, y:to_y}, pen_color, 80, 0.1);
        }, this);
	},
}

// SnowPen
var SnowPen = function () {};
SnowPen.prototype = {
	draw : function (x, y) {
        _(10).times(function (n) {
            var d = (count + n * 36) % 360;
            effects.push(new SnowObj(x, y, pen_color, d));
        }, this);
	},
}

// CollatzPen
var CollatzPen = function () {};
CollatzPen.prototype = {
	draw : function (x, y) {
        effects.push(new CollatzObj(x, y, pen_color));
	},
}

// HoshiPen
var HoshiPen = function () {};
HoshiPen.prototype = {
	draw : function (x, y) {
         effects.push(new HoshiObj(x, y, pen_color));
	},
}

// HanePen
var HanePen = function () {};
HanePen.prototype = {
	draw : function (x, y) {
        effects.push(new HaneObj(x, y, pen_color));
	},
}

// YamiPen
var YamiPen = function () {};
YamiPen.prototype = {
	draw : function (x, y) {
        c.globalCompositeOperation = "source-over";
        drawCircle(x, y, pen_size, HSVtoRGB(0,0,0), 0.2, 1.0);
        c.globalCompositeOperation = "lighter";

	},
}

// NamiPen
var NamiPen = function () {};
NamiPen.prototype = {
	draw : function (x, y) {
        effects.push(new NamiObj(x, y, pen_color, pen_size));
	},
}

// SprayPen
var SprayPen = function () {};
SprayPen.prototype = {
	draw : function (x, y) {
        _(pen_size * 20).times(function (n) {
            var rx = normalRand(x, pen_size / 2);
            var ry = normalRand(y, pen_size / 2);
            drawPoint(rx, ry, pen_color, 0.6);
        }, this)
	},
}

// BubblePen
var BubblePen = function () {};
BubblePen.prototype = {
	draw : function (x, y) {
        _(pen_size * 1).times(function (n) {
            var rx = normalRand(x, pen_size / 2);
            var ry = normalRand(y, pen_size / 2);
            drawCircle(rx, ry, Math.random() * (pen_size / 10), pen_color, 1, 0.1);
        }, this)
	},
}

// DegiPen
var DegiPen = function () {};
DegiPen.prototype = {
	draw : function (x, y) {
        effects.push(new DegiObj(x, y, pen_color));
	},
}


// support
function collatz (n) {
    var result = [];
    while (1) {
        if (0 === n || 1 === n) {
            result.push(n);
            break;
        }

        result.push(n);

        if (0 === n % 2) {
            n = n / 2;
        } else {
            n = n * 3 + 1;
        }
    }

    return result;
}

function naruto(n, a) {
    var result = [];
    var theta = count % 60 * 6;
    var inc = n / 40;
    for (var i = 1; i < n; i += inc) {
        theta += 1;
        result.push(polar2descartes(i, theta * a));
    }

    return result;
}

function polar2descartes(r, theta) {
    return {
        x:r * Math.cos(theta),
        y:r * Math.sin(theta),
    };
}

function normalRand(m, s) {
    var a = 1 - Math.random();
    var b = 1 - Math.random();
    var c = Math.sqrt(-2 * Math.log(a));
    if (0.5 - Math.random() > 0) {
        return c * Math.sin(Math.PI * 2 * b) * s + m;
    } else {
        return c * Math.cos(Math.PI * 2 * b) * s + m;
    }
}


// objs
var BloodObj = function (x, y, color) {
	this.pos = {x:x,y:y};
    this.spd = pen_size / 10;
	this.d = 1 + Math.floor(Math.random() * 360);
	this.size = 1;
	this.rotate_count = 2 + Math.floor(Math.random() * 5);
	this.alpha = 0.3;
	this.del_flg = false;
	this.ppos = {x:0, y:0};
    this.color = color;
    this.pos_history = [];
    this.dec_alpha_p = 0.001;
    this.history_num = 3;
};
BloodObj.prototype = {
	move : function () {
        this.dec_alpha_p += 0.0004;
        this.alpha = Math.max(0, this.alpha - this.dec_alpha_p);
        
        this.pos_history.push(this.pos);
        if (this.history_num <= this.pos_history.length) {
            this.pos_history = _.last(this.pos_history, this.history_num);
        }

        if (0 == Math.floor(Math.random() * 20)) {
            var eo = new BloodObj(this.pos.x, this.pos.y, pen_color);
            eo.alpha = this.alpha;
            eo.d = this.d + (Math.floor(Math.random() * 120) - 60)
            effects.push(eo);
        }
        
		this.pos = movePos(this.pos, this.spd, this.d);
		this.rotate_count -= 1;

		if (this.rotate_count <= 0) {
			this.rotate_count = 2 + Math.floor(Math.random() * 2);

            var a = Math.floor(Math.random() * 80) - 40;
			this.d += a;
            
		}

		if (this.pos.x < 0 - MARGIN ||
            this.pos.y < 0 - MARGIN ||
            this.pos.x > width + MARGIN ||
            this.pos.y > height + MARGIN ||
            this.alpha <= 0) {
			this.delete();
		}
	},
	
	render : function () {
        drawLines(this.pos_history, this.color, this.alpha, this.alpha * 8);
	},

	delete : function () {
		this.del_flg = true;
	},
}

var SnowObj = function (x, y, color, d) {
	this.pos = {x:x, y:y};
    this.spd = pen_size / 10;
	this.d = d;
	this.size = pen_size;
	this.alpha = 0.2;
	this.del_flg = false;
    this.color = color;
};
SnowObj.prototype = {
	move : function () {
        this.pos = movePos(this.pos, this.spd, this.d);
        this.spd += 0.2;
        this.alpha = Math.max(0, this.alpha - 0.01);
		if (this.pos.x < 0 - MARGIN ||
            this.pos.y < 0 - MARGIN ||
            this.pos.x > width + MARGIN ||
            this.pos.y > height + MARGIN ||
            this.alpha <= 0) {
			this.delete();
		}
	},
	
	render : function () {
        var x = this.pos.x;
        var y = this.pos.y;
        var pos1 = {x:Math.floor(Math.random() * pen_size) - (pen_size / 2) + x, y:Math.floor(Math.random() * pen_size) - (pen_size / 2) + y}
		var pos2 = {x:Math.floor(Math.random() * pen_size) - (pen_size / 2) + x, y:Math.floor(Math.random() * pen_size) - (pen_size / 2) + y}
		var pos3 = {x:Math.floor(Math.random() * pen_size) - (pen_size / 2) + x, y:Math.floor(Math.random() * pen_size) - (pen_size / 2) + y}

        drawTriangle(pos1, pos2, pos3, this.color, this.alpha);
	},

	delete : function () {
		this.del_flg = true;
	},
}

var HoshiObj = function (x, y, color) {
    this.pos = {x:x, y:y};
    this.color = color;
    this.alpha = 0.4;
    this.size = 1;
    this.naruto_list = naruto(pen_size, 10);
    this.del_flg = false;
};
HoshiObj.prototype = {
	move : function () {
        this.naruto_list = _.rest(this.naruto_list);
        if (this.naruto_list.length === 2) {
            this.delete();
        }
	},
	
	render : function () {
        var pos1 = {x:this.pos.x + this.naruto_list[0].x,
                    y:this.pos.y + this.naruto_list[0].y,
                   };
        var pos2 = {x:this.pos.x + this.naruto_list[1].x,
                    y:this.pos.y + this.naruto_list[1].y,
                   };
        drawLineColor(pos1, pos2, this.color, this.alpha, this.size);
	},

	delete : function () {
		this.del_flg = true;
	},
}


var NamiObj = function (x, y, color) {
	this.pos = {x:x, y:y};
	this.size = pen_size;
	this.alpha = 0.6;
	this.del_flg = false;
    this.c = 0;
    this.color = color;
    this.od = count % 360;
};
NamiObj.prototype = {
	move : function () {
        this.c += 1;
        this.alpha -= 0.01;
        this.d = (Math.sin(d2r(count % 60 * 6)) * 93) + this.od;
        this.pos = movePos(this.pos, pen_size / 10, this.d);
        
		if (this.pos.x < 0 - MARGIN ||
            this.pos.y < 0 - MARGIN ||
            this.pos.x > width + MARGIN ||
            this.pos.y > height + MARGIN ||
            this.alpha <= 0 ||
            this.c > 3600) {
			this.delete();
		}
	},
	
	render : function () {
        var pos1 = this.pos;
    	var pos2 = movePos(this.pos, this.size / 2, (this.d + 180) % 360);
    	var pos3 = movePos(this.pos, this.size, (this.d + 180) % 360 - Math.floor(Math.random() * 20));
    	var pos4 = movePos(this.pos, this.size, (this.d + 180) % 360 + Math.floor(Math.random() * 20));
        
        drawLineColor(pos1, pos2, pen_color, this.alpha, 0.2);
        drawLineColor(pos1, pos3, pen_color, this.alpha, 0.2);
        drawLineColor(pos1, pos4, pen_color, this.alpha, 0.2);
	},

	delete : function () {
		this.del_flg = true;
	},
}

var HaneObj = function (x, y, color) {
    this.pos = {x:x, y:y};
    this.color = color;
    this.alpha = 0.4;
    this.size = 1;
    this.naruto_list = naruto(pen_size, 100000);
    this.del_flg = false;
};
HaneObj.prototype = {
	move : function () {
        this.naruto_list = _.rest(this.naruto_list);
        if (this.naruto_list.length <= 2) {
            this.delete();
        }
	},
	
	render : function () {
        var pos1 = {x:this.pos.x + this.naruto_list[0].x,
                    y:this.pos.y + this.naruto_list[0].y,
                   };
        var pos2 = {x:this.pos.x + this.naruto_list[1].x,
                    y:this.pos.y + this.naruto_list[1].y,
                   };
        drawLineColor(pos1, pos2, this.color, this.alpha, this.size);
	},

	delete : function () {
		this.del_flg = true;
	},
}



var CollatzObj = function (x, y, color) {
    this.pos = {x:x, y:y};
    this.color = color;
    this.alpha = 0.5;
    this.collatz_list = collatz(pen_size);
    this.del_flg = false;
    this.n = 0;
};
CollatzObj.prototype = {
	move : function () {
        this.n = _.first(this.collatz_list);
        this.collatz_list = _.rest(this.collatz_list);

        if (1 == this.collatz_list.length) {
            this.delete();
        }
        
        var move_size = this.n / 2;
        var d = Math.floor(Math.random() * 360);
        
        this.pos = {
            x: this.pos.x + Math.cos(d2r(d)) * move_size,
            y: this.pos.y + Math.sin(d2r(d)) * move_size,
        };
	},
	
	render : function () {
        drawCircle(this.pos.x, this.pos.y, this.n, this.color, this.alpha, 0.8, 0.9);
	},

	delete : function () {
		this.del_flg = true;
	},
}

var DegiObj = function (x, y, color) {
	this.pos = {x:x,y:y};
    this.spd = pen_size / 10;
	this.d = _.first(_.shuffle([0, 90, 180, 270]));;
	this.size = 1;
	this.rotate_count = 2 + Math.floor(Math.random() * 5);
	this.alpha = 0.3;
	this.del_flg = false;
	this.ppos = {x:0, y:0};
    this.color = color;
    this.pos_history = [];
    this.dec_alpha_p = 0.001;
    this.history_num = 3;
};
DegiObj.prototype = {
	move : function () {
        this.dec_alpha_p += 0.0004;
        this.alpha = Math.max(0, this.alpha - this.dec_alpha_p);
        
        this.pos_history.push(this.pos);
        if (this.history_num <= this.pos_history.length) {
            this.pos_history = _.last(this.pos_history, this.history_num);
        }

        if (0 == Math.floor(Math.random() * 20)) {
            var eo = new DegiObj(this.pos.x, this.pos.y, pen_color);
            eo.alpha = this.alpha;
            eo.d = _.first(_.shuffle([0, 90, 180, 270]));
            effects.push(eo);
        }
        
		this.pos = movePos(this.pos, this.spd, this.d);
		this.rotate_count -= 1;

		if (this.rotate_count <= 0) {
			this.rotate_count = 2 + Math.floor(Math.random() * 2);

            var a = Math.floor(Math.random() * 80) - 40;
            a = _.first(_.shuffle([0, 90, 180, 270]));
			this.d += a;
            
		}

		if (this.pos.x < 0 - MARGIN ||
            this.pos.y < 0 - MARGIN ||
            this.pos.x > width + MARGIN ||
            this.pos.y > height + MARGIN ||
            this.alpha <= 0) {
			this.delete();
		}
	},
	
	render : function () {
        drawLines(this.pos_history, this.color, this.alpha, 1);
	},

	delete : function () {
		this.del_flg = true;
	},
}
