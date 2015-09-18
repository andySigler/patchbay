
////////////////////////////////////
////////////////////////////////////

var canvas,context;
var theWidth,theHeight,usedSize,middleX,middleY;

var outCircle, inCircle;
var mouse;

var touchedPort = undefined;
var hoveredPort = undefined;

var allConnections = {};

var statelessConnections = {};

var inNameBlock,outNameBlock;

var colorPalette = [
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
		'r':252,
		'g':120,
		'b':43
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

	var flushTimeout;

    function getPos(e){
    	var x = e.gesture.center.pageX-canvas.andyX;
		var y = e.gesture.center.pageY-canvas.andyY;
		return {'x':x,'y':y};
    }

	var hammerTime = Hammer(canvas);

	hammerTime.on('touch',function(event){
		event.gesture.preventDefault();
		var pos = getPos(event);
		mouse.dragEvent(pos.x,pos.y,true);
		mouse.touchEvent();

		flushTimeout = setTimeout(flushScene, 1500); // flush the scene after holding screen
	});
	var didTap = false;
	hammerTime.on('tap',function(event){
		event.gesture.preventDefault();
		clearTimeout(flushTimeout);
		didTap = true;
	});
	var didDoubleTap = false;
	hammerTime.on('doubletap',function(event){
		event.gesture.preventDefault();
		clearTimeout(flushTimeout);
		didDoubleTap = true;
	});
	hammerTime.on('release',function(event){
		event.gesture.preventDefault();
		clearTimeout(flushTimeout);

		var pos = getPos(event);

		if(didDoubleTap) mouse.doubletapEvent(pos.x,pos.y);

		else if(didTap) mouse.tapEvent(pos.x,pos.y);

		else mouse.releaseEvent(pos.x,pos.y);

		if(hoveredPort){
			hoveredPort.hovereed = false;
			hoveredPort = undefined;
		}

		didTap = false;
		didDoubleTap = false;
	});
	hammerTime.on('dragleft dragright dragup dragdown swipeleft swiperight swipeup swipedown',function(event){
		event.gesture.preventDefault();
		clearTimeout(flushTimeout);
		var pos = getPos(event);
		mouse.dragEvent(pos.x,pos.y,false);
	});

	makeCircles();

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

	for(var i in statelessConnections){
		statelessConnections[i].update();
		if(statelessConnections[i].finished) {
			delete statelessConnections[i];
		}
	}

	// drawing stuff
	context.clearRect(0,0,canvas.width,canvas.height);
	context.save();

	outCircle.drawArcs();
	inCircle.drawArcs();

	outCircle.drawNames();
	inCircle.drawNames();

	outCircle.drawPorts();
	inCircle.drawPorts();

	for(var i in allConnections){
		allConnections[i].draw();
	}

	for(var i in statelessConnections){
		statelessConnections[i].draw();
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

	// then draw the outlining circle
	var tempSize = touchedPort.size;

	context.save();
	context.lineWidth = tempSize*.1;
	context.strokeStyle = 'white';
	context.beginPath();
	context.arc(touchedPort.x,touchedPort.y,tempSize,0,Math.PI*2,false);
	context.stroke();
	context.restore();

	// then draw the line
	context.save();

	context.lineWidth = (Math.sin(touchedPort.wobbleCounter)*2)+Math.max(touchedPort.size*.05,2);
	context.strokeStyle = 'rgb(100,255,100)';

	context.beginPath();
	context.moveTo(touchedPort.x,touchedPort.y);
	context.lineTo(mouse.x,mouse.y);

	context.stroke();
	context.restore();

	context.save();

	context.fillStyle = 'white';
	var tempSize = touchedPort.size*scaler*.3;

	context.beginPath();
	context.arc(touchedPort.x,touchedPort.y,tempSize*.33,0,Math.PI*2,false);

	context.fill();
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

	var tempSize = hoveredPort.size;

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

	outCircle = new Circle(context,'output',screenPercentage,tempThickness);
	inCircle = new Circle(context,'input',screenPercentage,tempThickness);
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function updateNodes(scene){
	for(var n in scene){
		scene[n].patchbay.represented = false;
	}

	for(var i=0;i<outCircle.arcs.length;i++){
		if(outCircle.arcs[i].uuid!=='fake'){
			var stillReal = false;
			for(var n in scene){
				if(scene[n].patchbay.uuid===outCircle.arcs[i].uuid){
					var stillReal = true;
					scene[n].patchbay.represented = true;
					// it already exists, so just update it's info
					outCircle.arcs[i].handleMeta(scene[n].patchbay);
					inCircle.arcs[i].handleMeta(scene[n].patchbay);
					break;
				}
			}
			if(!stillReal){
				// make sure there are no more connections from/to it
				eraseNodeFromConnections(outCircle.arcs[i].uuid);

				// then erase this arc from the circles
				outCircle.deleteArc(outCircle.arcs[i].uuid);
				inCircle.deleteArc(inCircle.arcs[i].uuid);
			}
		}
	}
	for(var n in scene){
		if(!scene[n].patchbay.represented){
			var test = false;
			for(var i=0;i<outCircle.arcs.length;i++){
				if(outCircle.arcs[i].uuid===scene[n].patchbay.uuid){
					test = true;
				}
			}
			if(!test){
				var rColorIndex = scene[n].patchbay.id % colorPalette.length;
				var color = colorPalette[rColorIndex];
				// create a new arc for this node
				outCircle.addArc(scene[n].patchbay.name,color,scene[n].patchbay.uuid,scene[n].patchbay.id);
				inCircle.addArc(scene[n].patchbay.name,color,scene[n].patchbay.uuid,scene[n].patchbay.id);

				// then handle the meta data
				outCircle.arcs[outCircle.arcs.length-1].handleMeta(scene[n].patchbay);
				inCircle.arcs[outCircle.arcs.length-1].handleMeta(scene[n].patchbay);
			}
		}
	}
}

//////////////
//////////////
//////////////

function eraseNodeFromConnections(id){
	console.log('calling erasing links for '+id);
	for(var n in allConnections){
		// var portIDs = n.split('__')[0].split('/');
		// if(portIDs[0]==id || portIDs[1]==id){
		// 	console.log('deleting connections');
		// 	delete allConnections[n];
		// }

		var thisLink = allConnections[n];
		if(thisLink) {
			if(thisLink.outPort && thisLink.outPort.parent && thisLink.outPort.parent.id==id) {
				console.log('deleting connection');
				delete allConnections[n];
			} 
			else if(thisLink.inPort && thisLink.inPort.parent && thisLink.inPort.parent.id==id) {
				console.log('deleting connection');
				delete allConnections[n];
			} 
		}
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function adjustCanvas(){
	if(outCircle && inCircle){

		if(window.innerWidth<500){
			document.getElementById('container').className = 'minScaler';
		}
		else if(window.innerWidth>950){
			document.getElementById('container').className = 'maxScaler';
		}
		else{
			document.getElementById('container').className = 'middleScaler';
		}

		theWidth = window.innerWidth;
		theHeight = window.innerHeight;

		canvas.width = theWidth;
		canvas.height = theHeight;
		canvas.style.width = theWidth+'px';
		canvas.style.height = theHeight+'px';

		middleX = Math.floor(theWidth/2);
		middleY = Math.floor(theHeight/2);

		usedSize = Math.min(theWidth,theHeight*1);

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

	function findPos(obj) {
		var curleft = curtop = 0;
		if (obj.offsetParent) {
			do {
				curleft += obj.offsetLeft;
				curtop += obj.offsetTop;
			}
			while (obj = obj.offsetParent);
			return [curleft,curtop];
		}
	}
	var canPos = findPos(canvas);
	canvas.andyX = canPos[0];
	canvas.andyY = canPos[1];

	document.getElementById('routerContainer').style.height = canvas.height+'px';
	document.getElementById('routerContainer').style.width = canvas.width+'px';
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