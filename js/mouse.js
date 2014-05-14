////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function Mouse() {
	this.x = undefined;
	this.y = undefined;
	this.xDiff = undefined;
	this.yDiff = undefined;
	this.down = false;
	this.in_radianDiff = undefined;
	this.in_radianPrev = undefined;
	this.in_radianNew = undefined;
	this.out_radianDiff = undefined;
	this.out_radianPrev = undefined;
	this.out_radianNew = undefined;
	this.topSide = false;

	this.justErased = false;
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Mouse.prototype.touchEvent = function(){

	this.down = true;

	this.xDiff = 0;
	this.yDiff = 0;

	var test = false;

	for(var i in allConnections){
		if(allConnections[i].hovered){
			var xDiff = this.x-allConnections[i].deleteX;
			var yDiff = this.y-allConnections[i].deleteY;
			var tempDist = Math.sqrt(xDiff*xDiff+yDiff*yDiff);
			if(tempDist<allConnections[i].deleteSize){
				var receiveID = allConnections[i].outPort.parent.id;
				var routeID = allConnections[i].inPort.parent.id;
				var inportIndex = allConnections[i].inPort.index;
				sendRoute(receiveID,routeID,inportIndex,99);
				this.justErased = true;
				if(testingGUI) delete allConnections[i];
				test = true;
				break;
			}
		}
	}

	if(!test){
		var in_xDist = Math.abs(inCircle.centerX-this.x);
		var in_yDist = Math.abs(inCircle.centerY-this.y);
		var out_xDist = Math.abs(outCircle.centerX-this.x);
		var out_yDist = Math.abs(outCircle.centerY-this.y);

		var in_distFromCenter = Math.sqrt(in_xDist*in_xDist+in_yDist*in_yDist);
		var out_distFromCenter = Math.sqrt(out_xDist*out_xDist+out_yDist*out_yDist);
		var outOuterRad = (outCircle.radiusPercentage*usedSize)+(outCircle.lineWidth*.4);
		var outInnerRad = (outCircle.radiusPercentage*usedSize)-(outCircle.lineWidth*.4);
		var inOuterRad = (inCircle.radiusPercentage*usedSize)+(inCircle.lineWidth*.4);
		var inInnerRad = (inCircle.radiusPercentage*usedSize)-(inCircle.lineWidth*.4);

		if(out_distFromCenter<=outOuterRad && out_distFromCenter>=outInnerRad){
			outCircle.mouseEvent(this.x,this.y);
		}
		else if(in_distFromCenter<=inOuterRad && in_distFromCenter>=inInnerRad){
			inCircle.mouseEvent(this.x,this.y);
		}
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Mouse.prototype.tapEvent = function(_x,_y){
	if(inCircle.touched){
		for(var i=0;i<inCircle.arcs.length;i++){
			if(inCircle.arcs[i].touched){
				inCircle.startAutoMove(i);
			}
		}
	}
	else if(outCircle.touched){
		for(var i=0;i<outCircle.arcs.length;i++){
			if(outCircle.arcs[i].touched){
				outCircle.startAutoMove(i);
			}
		}
	}

	if(this.x&&this.y){
		this.xDiff = _x-this.x;
		this.yDiff = _y-this.y;
	}
	this.x = _x;
	this.y = _y;
	this.down = false;
	this.radianDown = undefined;
	this.radianDiff = undefined;

	if(touchedPort || this.justErased){
		if(touchedPort && touchedPort.type==='in'){
			for(var n in allConnections){
				console.log(allConnections[n]);
				if(allConnections[n].inPort===touchedPort){
					allConnections[n].hovered = true;
				}
				else{
					allConnections[n].hovered = false;
				}
			}
		}
		else if(touchedPort){
			console.log('one');
			for(var n in allConnections){
				console.log(allConnections[n]);
				if(allConnections[n].outPort===touchedPort){
					allConnections[n].hovered = true;
				}
				else{
					allConnections[n].hovered = false;
				}
			}
		}
		this.justErased = false;
	}
	else{
		for(var n in allConnections){
			allConnections[n].hovered = false;
		}
	}

	touchedPort = undefined;
	hoveredPort = undefined;

	inNameBlock.touched = false;
	outNameBlock.touched = false;

	outCircle.touched = false;
	for(var i=0;i<outCircle.arcs.length;i++){
		outCircle.arcs[i].touched = false;
		for(var n=0;n<outCircle.arcs[i].ports.length;n++){
			outCircle.arcs[i].ports[n].touched = false;
			outCircle.arcs[i].ports[n].hovered = false;
		}
	}

	inCircle.touched = false;
	for(var i=0;i<inCircle.arcs.length;i++){
		inCircle.arcs[i].touched = false;
		for(var n=0;n<inCircle.arcs[i].ports.length;n++){
			inCircle.arcs[i].ports[n].touched = false;
			inCircle.arcs[i].ports[n].hovered = false;
		}
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Mouse.prototype.releaseEvent = function(_x,_y){
	if(this.x&&this.y){
		this.xDiff = _x-this.x;
		this.yDiff = _y-this.y;
	}
	this.x = _x;
	this.y = _y;
	this.down = false;
	this.radianDown = undefined;
	this.radianDiff = undefined;

	inNameBlock.touched = false;
	outNameBlock.touched = false;

	if(touchedPort && hoveredPort && hoveredPort!=touchedPort){
		this.makeConnection(hoveredPort,touchedPort);
	}

	touchedPort = undefined;
	hoveredPort = undefined;

	for(var n in allConnections){
		allConnections[n].hovered = false;
	}

	outCircle.touched = false;
	for(var i=0;i<outCircle.arcs.length;i++){
		outCircle.arcs[i].touched = false;
		for(var n=0;n<outCircle.arcs[i].ports.length;n++){
			outCircle.arcs[i].ports[n].touched = false;
			outCircle.arcs[i].ports[n].hovered = false;
		}
	}

	inCircle.touched = false;
	for(var i=0;i<inCircle.arcs.length;i++){
		inCircle.arcs[i].touched = false;
		for(var n=0;n<inCircle.arcs[i].ports.length;n++){
			inCircle.arcs[i].ports[n].touched = false;
			inCircle.arcs[i].ports[n].hovered = false;
		}
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Mouse.prototype.makeConnection = function(port1,port2){
	var inPort,outPort;

	if(port1.type==='in'){
		inPort = port1;
		outPort = port2;
	}
	else{
		inPort = port2;
		outPort = port1;
	}

	// var tempName = outputArcID+'-'+inputArcID+'__'+outIndex+'-'+inIndex;
	var tempName = String(outPort.parent.id+'/'+inPort.parent.id+'__'+inPort.index+'/'+outPort.index);

	if(!allConnections[tempName]){
		var receiverID = outPort.parent.id;
		var senderID = inPort.parent.id;
		sendRoute(receiverID,senderID,inPort.index,outPort.index);
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Mouse.prototype.dragEvent = function(_x,_y,initRadians){
	if(this.x&&this.y){
		this.xDiff = _x-this.x;
		this.yDiff = _y-this.y;
	}
	this.x = _x;
	this.y = _y;

	if(this.y>middleY) this.topSide = true;
	else this.topSide = false;

	if(!initRadians){
		this.in_radianPrev = this.in_radianNew;
		this.out_radianPrev = this.out_radianNew;
	}
	this.in_radianNew = this.radiansFromCenter(this.x,this.y,'in');
	this.out_radianNew = this.radiansFromCenter(this.x,this.y,'out');
	if(initRadians){
		this.in_radianPrev = this.in_radianNew;
		this.out_radianPrev = this.out_radianNew;
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Mouse.prototype.update = function(){
	var blockSpeed = 0.002;
	if(this.down || touchedPort) this.findHover();

	if(this.down && outCircle.arcs.length>1){
		var in_radianDiff = this.in_radianNew-this.in_radianPrev;
		var out_radianDiff = this.out_radianNew-this.out_radianPrev;

		if(outCircle.touched){
			outCircle.radiansMoved = out_radianDiff;
		}
		else if(inCircle.touched){
			inCircle.radiansMoved = in_radianDiff;
		}
		else if(inNameBlock.touched){
			if(theHeight>theWidth){
				if(in_radianDiff!=0) inCircle.radiansMoved -= (this.xDiff*blockSpeed);
			}
			else{
				if(in_radianDiff!=0) inCircle.radiansMoved += (this.yDiff*blockSpeed);
			}
		}
		else if(outNameBlock.touched){
			if(theHeight>theWidth){
				if(out_radianDiff!=0) outCircle.radiansMoved += (this.xDiff*blockSpeed);
			}
			else{
				if(out_radianDiff!=0) outCircle.radiansMoved -= (this.yDiff*blockSpeed);
			}
		}
	}

	this.xDiff = 0;
	this.yDiff = 0;

	this.in_radianPrev = this.in_radianNew;
	this.out_radianPrev = this.out_radianNew;
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Mouse.prototype.findHover = function(){

	if(hoveredPort) hoveredPort.hovered = false;

	hoveredPort = undefined;

	if(!outCircle.touched && !inCircle.touched){

		if(outCircle.arcs.length>0 && ((touchedPort&&touchedPort.type=='in')||!touchedPort)){
			for(var i=0;i<2;i++){
				if(!hoveredPort && outCircle.highlighted[String(i)]){
					var index = (i+outCircle.arcOffset)%outCircle.arcs.length;
					var len = outCircle.arcs[index].ports.length;
					for(var n=0;n<len;n++){
						var xDiff = outCircle.arcs[index].ports[n].x-mouse.x;
						var yDiff = outCircle.arcs[index].ports[n].y-mouse.y;
						var absDiff = Math.sqrt(xDiff*xDiff+yDiff*yDiff);
						if(absDiff<outCircle.arcs[index].ports[n].size*.75){
							hoveredPort = outCircle.arcs[index].ports[n];
							outCircle.arcs[index].ports[n].hovered = true;
							break;
						}
						else{
							outCircle.arcs[index].ports[n].hovered = false;
						}
					}
				}
			}
		}
		if(!hoveredPort && inCircle.arcs.length>0 && ((touchedPort&&touchedPort.type=='out')||!touchedPort)){
			//loop through inner seen ports
			for(var i=0;i<2;i++){
				if(!hoveredPort && inCircle.highlighted[String(i)]){
					var index = (i+inCircle.arcOffset)%inCircle.arcs.length;
					var len = inCircle.arcs[index].ports.length;
					for(var n=0;n<len;n++){
						var xDiff = inCircle.arcs[index].ports[n].x-mouse.x;
						var yDiff = inCircle.arcs[index].ports[n].y-mouse.y;
						var absDiff = Math.sqrt(xDiff*xDiff+yDiff*yDiff);
						if(absDiff<inCircle.arcs[index].ports[n].size/2){
							hoveredPort = inCircle.arcs[index].ports[n];
							inCircle.arcs[index].ports[n].hovered = true;
							break;
						}
						else{
							inCircle.arcs[index].ports[n].hovered = false;
						}
					}
				}
			}
		}
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Mouse.prototype.radiansFromCenter = function(x,y,which){
	var radFromCenter;

	var _middleX = outCircle.centerX;
	var _middleY = outCircle.centerY;
	if(which==='in'){
		_middleX = inCircle.centerX;
		_middleY = inCircle.centerY;
	}

	var yDist = Math.abs(_middleY-y);
	var xDist = Math.abs(_middleX-x);

	if(x>_middleX){
		if(y>_middleY){
			// bottom right
			radFromCenter = Math.atan(yDist/xDist);
		}
		else if(y<_middleY){
			// top right
			radFromCenter = Math.atan(xDist/yDist) + (Math.PI*1.5);
		}
		else{
			// we're touching the y line
			radFromCenter = 0;
		}
	}
	else if(x<_middleX){
		if(y>_middleY){
			// bottom left
			radFromCenter = Math.atan(xDist/yDist) + (Math.PI*.5);
		}
		else if(y<_middleY){
			// top left
			radFromCenter = Math.atan(yDist/xDist) + Math.PI;
		}
		else{
			// we're touching the y line
			radFromCenter = Math.PI;
		}
	}
	else{
		//we're touching the x line
		if(y>_middleY){
			radFromCenter = Math.PI*.5;
		}
		else if(y<_middleY){
			radFromCenter = Math.PI*1.5;
		}
		else{
			// we're touching the middle
			radFromCenter = 0;
		}
	}

	return radFromCenter;
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////