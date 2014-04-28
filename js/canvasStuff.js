
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

var inNameBlock,outNameBlock;

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
	},
	{
		'r':252,
		'g':120,
		'b':43
	}
];

function setupCanvas(){
	canvas = document.getElementById('canvas');
	adjustCanvas();
	context = canvas.getContext('2d');

	mouse = new Mouse();

	document.addEventListener("touchmove", function(e){
        if(e.srcElement.className!='slider') e.preventDefault();
    }, false);

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
	adjustCanvas();

	inNameBlock = new NameBlock(context,inCircle);
	outNameBlock = new NameBlock(context,outCircle);

	adjustCanvas();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function drawLoop(){

	inNameBlock.update();
	outNameBlock.update();

	mouse.update();

	outCircle.update(usedSize);
	inCircle.update(usedSize);

	for(var i in allConnections){
		allConnections[i].update();
	}

	// drawing stuff
	context.clearRect(0,0,canvas.width,canvas.height);
	context.save();

	inNameBlock.draw();
	outNameBlock.draw();

	//drawCircleLabels();

	outCircle.drawArcs();
	inCircle.drawArcs();

	outCircle.drawNames();
	inCircle.drawNames();

	outCircle.drawPorts();
	inCircle.drawPorts();

	for(var i in allConnections){
		allConnections[i].draw();
	}

	if(touchedPort) drawTouchedPort();
	if(hoveredPort) drawHoveredPort();

	//drawScroller();

	requestAnimFrame(drawLoop);
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function drawCircleLabels(){
	context.save();

	context.font = '30px Helvetica';
	context.fillStyle = 'black';
	context.textAlign = 'center';
	context.fillText('inputs',0,-inCircle.radiusPercentage*usedSize*.6);

	context.font = '30px Helvetica';
	context.fillStyle = 'black';
	context.textAlign = 'center';
	context.fillText('outputs',0,outCircle.radiusPercentage*usedSize*.85);

	context.restore();
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
	context.arc(touchedPort.x,touchedPort.y,tempSize*.33,0,Math.PI*2,false);

	context.fill();
	context.restore();

	// then draw the outlining circle
	var tempSize = touchedPort.size*scaler*1;

	context.save();
	context.lineWidth = tempSize*.1;
	context.strokeStyle = 'black';
	context.beginPath();
	context.arc(touchedPort.x,touchedPort.y,tempSize,0,Math.PI*2,false);
	context.stroke();
	context.restore();

	// then draw the line
	context.save();

	context.lineWidth = 3;
	context.strokeStyle = 'black';

	context.beginPath();
	context.moveTo(touchedPort.x,touchedPort.y);
	context.lineTo(mouse.x,mouse.y);

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
	context.strokeStyle = 'rgb(100,255,100)';
	context.beginPath();
	context.arc(hoveredPort.x,hoveredPort.y,tempSize,0,Math.PI*2,false);
	context.stroke();
	context.restore();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function makeCircles(){
	var tempThickness = .2;

	var screenPercentage = 0.5;

	outCircle = new Circle(context,'out',screenPercentage,tempThickness);
	inCircle = new Circle(context,'in',screenPercentage,tempThickness);
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
				// make sure there are no more connections from/to it
				eraseNodeFromConnections(outCircle.arcs[i].id);

				// then erase this arc from the circles
				outCircle.deleteArc(outCircle.arcs[i].id);
				inCircle.deleteArc(inCircle.arcs[i].id);
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
				var rColorIndex = nodes[n].id%colorPalette.length;
				var color = colorPalette[rColorIndex];
				// create a new arc for this node
				outCircle.addArc(nodes[n].name,color,nodes[n].id);
				inCircle.addArc(nodes[n].name,color,nodes[n].id);
			}
		}
	}
}

function eraseNodeFromConnections(id){
	for(var n in allConnections){
		var portIDs = n.split('__')[0].split('/');
		if(portIDs[0]==id || portIDs[1]==id){
			delete allConnections[n];
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
	usedSize = Math.floor(Math.min(theWidth,theHeight)*.42);

	canvas.width = theWidth;
	canvas.height = theHeight;
	canvas.style.width = theWidth+'px';
	canvas.style.height = theHeight+'px';

	middleX = Math.floor(theWidth/2);
	middleY = Math.floor(theHeight/2);

	if(outCircle && inCircle){
		if(theWidth<theHeight){
			var _offset = usedSize*0.5;
			inCircle.centerX = middleX-_offset;
			outCircle.centerX = middleX+_offset;
			inCircle.centerY = middleY-_offset;
			outCircle.centerY = middleY+_offset;
		}
		else{
			var _offset = usedSize*0.5;
			inCircle.centerX = middleX-_offset;
			outCircle.centerX = middleX+_offset;
			inCircle.centerY = middleY-_offset;
			outCircle.centerY = middleY+_offset;
		}
	}

	if(inNameBlock && outNameBlock){
		var gutter = 0.15;
		if(theWidth<theHeight){
			inNameBlock.x = 0;
			inNameBlock.y = middleY-usedSize*(1.2+gutter);
			inNameBlock.width = theWidth;
			inNameBlock.height = usedSize*.2;

			outNameBlock.x = 0;
			outNameBlock.y = middleY+usedSize*(1+gutter);
			outNameBlock.width = theWidth;
			outNameBlock.height = usedSize*.2;
		}
		else{
			inNameBlock.x = middleX-usedSize*(1.5+gutter);
			inNameBlock.y = -theHeight*.25;
			inNameBlock.width = usedSize*.5;
			inNameBlock.height = theHeight;

			outNameBlock.x = middleX+usedSize*(1+gutter);
			outNameBlock.y = -theHeight*.25;
			outNameBlock.width = usedSize*.5;
			outNameBlock.height = theHeight;
		}
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