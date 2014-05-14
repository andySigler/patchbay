
////////////////////////////////////
////////////////////////////////////

var canvas,context;
var theWidth,theHeight,usedSize,middleX,middleY;

var outCircle, inCircle;
var mouse;

var touchedPort = undefined;
var hoveredPort = undefined;

var allConnections = {};

var inNameBlock,outNameBlock;

var colorPalette = [
	{
		'r':252,
		'g':120,
		'b':43
	},
	{
		'r':30,
		'g':147,
		'b':175
	},
	{
		'r':176,
		'g':176,
		'b':176
	},
	{
		'r':176,
		'g':176,
		'b':79
	},
	{
		'r':43,
		'g':211,
		'b':252
	},
	{
		'r':176,
		'g':79,
		'b':176
	},
	{
		'r':176,
		'g':79,
		'b':79
	}
];

function setupCanvas(){
	canvas = document.getElementById('canvas');
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
	var didTap = false;
	hammerTime.on('tap',function(event){
		event.gesture.preventDefault();
		didTap = true;
	});
	hammerTime.on('release',function(event){
		event.gesture.preventDefault();
		var x = event.gesture.center.pageX;
		var y = event.gesture.center.pageY;

		if(didTap) mouse.tapEvent(x,y);

		else mouse.releaseEvent(x,y);

		if(hoveredPort){
			hoveredPort.hovereed = false;
			hoveredPort = undefined;
		}
		didTap = false;
	});
	hammerTime.on('dragleft dragright dragup dragdown swipeleft swiperight swipeup swipedown',function(event){
		event.gesture.preventDefault();
		var x = event.gesture.center.pageX;
		var y = event.gesture.center.pageY;
		mouse.dragEvent(x,y,false);
	});

	makeCircles();

	inNameBlock = new NameBlock(context,inCircle);
	outNameBlock = new NameBlock(context,outCircle);

	adjustCanvas();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function drawLoop(){

	// inNameBlock.update();
	// outNameBlock.update();

	mouse.update();

	outCircle.update(usedSize);
	inCircle.update(usedSize);

	for(var i in allConnections){
		allConnections[i].update();
	}

	// drawing stuff
	context.clearRect(0,0,canvas.width,canvas.height);
	context.save();

	// inNameBlock.draw();
	// outNameBlock.draw();

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

	context.restore();

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

	context.fillStyle = 'white';

	context.beginPath();
	context.arc(touchedPort.x,touchedPort.y,tempSize*.33,0,Math.PI*2,false);

	context.fill();
	context.restore();

	// then draw the outlining circle
	var tempSize = touchedPort.size*scaler*1;

	context.save();
	context.lineWidth = tempSize*.1;
	context.strokeStyle = 'white';
	context.beginPath();
	context.arc(touchedPort.x,touchedPort.y,tempSize,0,Math.PI*2,false);
	context.stroke();
	context.restore();

	// then draw the line
	context.save();

	context.lineWidth = 3;
	context.strokeStyle = 'white';

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
	var tempThickness = .1;

	var screenPercentage = 0.25;

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

	if(inNameBlock && outNameBlock && outCircle && inCircle){

		theWidth = window.innerWidth;
		theHeight = window.innerHeight;

		canvas.width = theWidth;
		canvas.height = theHeight;
		canvas.style.width = theWidth+'px';
		canvas.style.height = theHeight+'px';

		middleX = Math.floor(theWidth/2);
		middleY = Math.floor(theHeight/2);

		usedSize = Math.min(theWidth,theHeight*1.2);

		if(theWidth<theHeight){
			var Xoffset = theWidth*.2;
			var Yoffset = theHeight*0.2;
			inCircle.centerX = middleX-Xoffset;
			outCircle.centerX = middleX+Xoffset;
			inCircle.centerY = middleY-Yoffset;
			outCircle.centerY = middleY+Yoffset;
		}
		else{
			var Xoffset = usedSize*.3;
			var Yoffset = theHeight*0.1;
			inCircle.centerX = middleX-Xoffset;
			outCircle.centerX = middleX+Xoffset;
			inCircle.centerY = middleY-Yoffset;
			outCircle.centerY = middleY+Yoffset;
		}
	}

	var title = document.getElementById('title');
	title.style.left = Math.floor(outCircle.centerX-(usedSize*.15))+'px';
	title.style.fontSize = Math.floor(usedSize*.15)+'px';
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