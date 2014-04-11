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
		mouse.dragEvent(x,y);
	});
	hammerTime.on('dragstart doubletap',function(event){
		event.gesture.preventDefault();
		mouse.touchEvent();
	});
	hammerTime.on('dragend',function(event){
		event.gesture.preventDefault();
		var x = event.gesture.center.pageX;
		var y = event.gesture.center.pageY;
		mouse.releaseEvent(x,y);
		if(hoveredPort){
			hoveredPort.hovereed = false;
			hoveredPort = undefined;
		}
	});
	hammerTime.on('dragleft dragright dragup dragdown swipeleft swiperight swipeup swipedown',function(event){
		event.gesture.preventDefault();
		var x = event.gesture.center.pageX;
		var y = event.gesture.center.pageY;
		mouse.dragEvent(x,y);
	});

	makeCircles();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function drawLoop(){

	mouse.update();

	if(hoveredPort){
		var id = 'inNames';
		if(hoveredPort.parent.type==='out') id = 'outNames';
		var div = document.getElementById(id);
		var r = hoveredPort.parent.c.r;
		var g = hoveredPort.parent.c.g;
		var b = hoveredPort.parent.c.b;
		div.style.color = 'rgb('+r+','+g+','+b+')';
		div.innerHTML = hoveredPort.name;
		// draw the ports name in the appropriate spot (in or out)
	}
	else if(!touchedPort){
		document.getElementById('outNames').innerHTML = "";
		document.getElementById('inNames').innerHTML = "";
	}

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

	if(touchedPort){
		drawTouchedPort();
	}
	else if(!hoveredPort){
		document.getElementById('outNames').innerHTML = "";
		document.getElementById('inNames').innerHTML = "";
	}

	outCircle.drawPorts();
	inCircle.drawPorts();

	context.restore();

	//drawScroller();

	requestAnimFrame(drawLoop);
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function drawTouchedPort(){
	context.save();
	context.beginPath();
	context.moveTo(touchedPort.x-middleX,touchedPort.y-middleY);
	context.lineTo(mouse.x-middleX,mouse.y-middleY);

	context.lineWidth = 3;
	context.strokeStyle = 'gray';
	context.stroke();
	context.restore();

	// draw the ports name in the appropriate spot (in or out)
	var id = 'inNames';
	var otherId = 'outNames';
	if(touchedPort.parent.type==='out'){
		id = 'outNames';
		otherId = 'inNames';
	}
	var div = document.getElementById(id);
	var r = touchedPort.parent.c.r;
	var g = touchedPort.parent.c.g;
	var b = touchedPort.parent.c.b;
	div.style.color = 'rgb('+r+','+g+','+b+')';
	div.innerHTML = touchedPort.name;

	if(!hoveredPort){
		document.getElementById(otherId).innerHTML = '';
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function makeCircles(){
	var tempThickness = .2;

	outCircle = new Circle(context,'out',1,tempThickness);
	inCircle = new Circle(context,'in',.5,tempThickness);
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