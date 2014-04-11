////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

var canvas,context;
var theWidth,theHeight,usedSize,middleX,middleY;

var outCircle, inCircle;
var mouse;

var touchedPort = undefined;
var hoveredPort = undefined;
var hoveredCord = undefined;

var allConnections = {};

var testerColor = {
	'r':252,
	'g':120,
	'b':43
};

var colorPalette = [
	{
		'r':30,
		'g':147,
		'b':175
	},
	{
		'r':43,
		'g':211,
		'b':252
	},
	{
		'r':79,
		'g':79,
		'b':79
	},
	{
		'r':176,
		'g':176,
		'b':176
	}
];

function setupCanvas(){
	canvas = document.getElementById('canvas');
	adjustCanvas();
	context = canvas.getContext('2d');

	mouse = new Mouse();

	var hammerTime = Hammer(canvas);

	hammerTime.on('touch',function(event){
		event.gesture.preventDefault();
		var x = event.gesture.center.pageX;
		var y = event.gesture.center.pageY;
		mouse.dragEvent(x,y,true);
		mouse.touchEvent();
	});
	var didDouble = false;
	hammerTime.on('doubletap',function(event){
		event.gesture.preventDefault();
		var x = event.gesture.center.pageX;
		var y = event.gesture.center.pageY;
		didDouble = true;
		mouse.dragEvent(x,y,true);
		mouse.touchEvent();
		if(outCircle.touched){
			//
		}
		else if(inCircle.touched){
			//
		}
	});
	hammerTime.on('dragend release',function(event){
		event.gesture.preventDefault();
		var x = event.gesture.center.pageX;
		var y = event.gesture.center.pageY;
		if(!didDouble){
			mouse.releaseEvent(x,y);
		}
		else didDouble = false;
		if(hoveredPort){
			hoveredPort.hovereed = false;
			hoveredPort = undefined;
		}
	});
	hammerTime.on('dragleft dragright dragup dragdown swipeleft swiperight swipeup swipedown',function(event){
		event.gesture.preventDefault();
		var x = event.gesture.center.pageX;
		var y = event.gesture.center.pageY;
		mouse.dragEvent(x,y,false);
	});

	makeCircles();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function drawLoop(){

	mouse.update();

	outCircle.update(usedSize);
	inCircle.update(usedSize);

	for(var i in allConnections){
		allConnections[i].update();
	}

	// drawing stuff
	context.clearRect(0,0,theWidth,theHeight);
	context.save();

	context.translate(theWidth*.45,theHeight*.5);

	outCircle.drawArcs();
	inCircle.drawArcs();

	outCircle.drawNames();
	inCircle.drawNames();

	for(var i in allConnections){
		allConnections[i].draw();
	}

	outCircle.drawPorts();
	inCircle.drawPorts();

	if(touchedPort) drawTouchedPort();
	if(hoveredPort) drawHoveredPort();

	context.restore();

	//drawScroller();

	requestAnimFrame(drawLoop);
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function drawTouchedPort(){

	// first draw the dot
	var scaler = touchedPort.scaler;
	scaler*=1.25;
	if(scaler>1) scaler = 1;
	else if(scaler<0) scaler = 0;

	var tempSize = touchedPort.size*scaler*.5;

	context.save();

	context.fillStyle = 'black';

	context.beginPath();
	context.arc(touchedPort.x-middleX,touchedPort.y-middleY,tempSize*.33,0,Math.PI*2,false);

	context.fill();
	context.restore();

	// then draw the line
	context.save();

	context.lineWidth = 3;
	context.strokeStyle = 'black';

	context.beginPath();
	context.moveTo(touchedPort.x-middleX,touchedPort.y-middleY);
	context.lineTo(mouse.x-middleX,mouse.y-middleY);

	context.stroke();
	context.restore();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function drawHoveredPort(){
	var scaler = hoveredPort.scaler;
	scaler*=1.25;
	if(scaler>1) scaler = 1;
	else if(scaler<0) scaler = 0;

	var tempSize = hoveredPort.size*scaler*1;

	context.save();
	context.lineWidth = tempSize*.1;
	context.strokeStyle = 'black';
	context.beginPath();
	context.arc(hoveredPort.x-middleX,hoveredPort.y-middleY,tempSize,0,Math.PI*2,false);
	context.stroke();
	context.restore();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function makeCircles(){
	var tempThickness = .2;

	var screenPercentage = 0.9;

	outCircle = new Circle(context,'out',screenPercentage,tempThickness);
	inCircle = new Circle(context,'in',screenPercentage/2,tempThickness);
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function updateNodes(nodes){
	for(var n in nodes){
		nodes[n].represented = false;
	}
	for(var i=0;i<outCircle.arcs.length;i++){
		if(outCircle.arcs[i].id>0){
			var stillReal = false;
			for(var n in nodes){
				if(nodes[n].id===outCircle.arcs[i].id){
					var stillReal = true;
					nodes[n].represented = true;
					// it already exists, so just update it's info
					outCircle.arcs[i].handleMeta(nodes[n]);
					inCircle.arcs[i].handleMeta(nodes[n]);
					break;
				}
			}
			if(!stillReal){
				// erase this arc from the circles
				outCircle.deleteArc(outCircle.arcs[i].id);
				inCircle.deleteArc(inCircle.arcs[i].id);

				// and make sure there are no more connections from/to it
			}
		}
	}
	for(var n in nodes){
		if(!nodes[n].represented){
			var test = false;
			for(var i=0;i<outCircle.arcs.length;i++){
				if(outCircle.arcs[i].id===nodes[n].id){
					test = true;
				}
			}
			if(!test){
				var color = {
					'r':Math.floor(Math.random()*255),
					'g':Math.floor(Math.random()*255),
					'b':Math.floor(Math.random()*255)
				}
				// create a new arc for this node
				outCircle.addArc(nodes[n].name,color,nodes[n].id);
				inCircle.addArc(nodes[n].name,color,nodes[n].id);
			}
		}
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

var counter = 0;

function adjustCanvas(){

	theWidth = window.innerWidth;
	theHeight = window.innerHeight;
	usedSize = Math.floor(Math.min(theWidth,theHeight)*.4);

	canvas.width = theWidth;
	canvas.height = theHeight;

	canvas.style.width = theWidth+'px';
	canvas.style.height = theHeight+'px';

	middleX = Math.floor(theWidth*.45);
	middleY = Math.floor(theHeight/2);

	if(testerDiv && testerDiv.custom){
		testerDiv.style.left = Math.floor(testerDiv.custom.xPos * window.innerWidth) + 'px';
	}
}

window.onresize = adjustCanvas;

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

window.requestAnimFrame = (function(){
	return  window.requestAnimationFrame       ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame    ||
	function( callback ){
		window.setTimeout(callback, 1000 / 60);
	};
})();

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////