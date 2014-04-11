////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function Mouse() {
	this.x = undefined;
	this.y = undefined;
	this.down = false;
	this.radianDiff = undefined;
	this.radianPrev = undefined;
	this.radianNew = undefined;
	this.topSide = false;
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Mouse.prototype.touchEvent = function(){

	this.down = true;

	if(hoveredCord){
		var name = hoveredCord.name;
		if(allConnections[name]){
			var c = allConnections[name];
			// sendRoute(receiveID,routeID,outputIndex,inputIndex)
			var receiverID = c.inPort.parent.id;
			var routerID = c.outPort.parent.id;
			sendRoute(receiverID,routerID,c.outPort.index,99);
		}
	}

	var xDist = Math.abs(middleX-this.x);
	var yDist = Math.abs(middleY-this.y);

	var outWidth = (outCircle.lineWidth*usedSize);
	var inWidth = (inCircle.lineWidth*usedSize);

	var distFromCenter = Math.sqrt(xDist*xDist+yDist*yDist);
	var outOuterRad = (outCircle.radiusPercentage*usedSize)+outCircle.lineWidth;
	var outInnerRad = (outCircle.radiusPercentage*usedSize)-outCircle.lineWidth;
	var inOuterRad = (inCircle.radiusPercentage*usedSize)+inCircle.lineWidth;
	var inInnerRad = (inCircle.radiusPercentage*usedSize)-inCircle.lineWidth;

	if(distFromCenter<=outOuterRad && distFromCenter>=outInnerRad){
		outCircle.touched = outCircle.mouseEvent(this.x,this.y);
	}
	else if(distFromCenter<=inOuterRad && distFromCenter>=inInnerRad){
		inCircle.touched = inCircle.mouseEvent(this.x,this.y);
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Mouse.prototype.releaseEvent = function(_x,_y){
	this.x = _x;
	this.y = _y;
	this.down = false;
	this.radianDown = undefined;
	this.radianDiff = undefined;

	if(touchedPort && hoveredPort && hoveredPort!=touchedPort){
		this.makeConnection(hoveredPort,touchedPort);
	}

	touchedPort = undefined;
	hoveredPort = undefined;
	hoveredCort = undefined;

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
	var tempName = String(outPort.parent.id+'/'+inPort.parent.id+'__'+outPort.index+'/'+inPort.index);

	if(!allConnections[tempName]){
		var receiverID = inPort.parent.id;
		var senderID = outPort.parent.id;
		sendRoute(receiverID,senderID,outPort.index,inPort.index);
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Mouse.prototype.dragEvent = function(_x,_y){
	this.x = _x;
	this.y = _y;

	if(this.y>middleY) this.topSide = true;
	else this.topSide = false;

	this.radianPrev = this.radianNew;

	this.radianNew = this.radiansFromCenter(this.x,this.y);
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Mouse.prototype.update = function(){
	this.findHover();

	if(this.down && outCircle.arcs.length>1){
		var radianDiff = this.radianNew-this.radianPrev;

		if(outCircle.touched){
			outCircle.radiansMoved = radianDiff;
		}
		else if(inCircle.touched){
			inCircle.radiansMoved = radianDiff;
		}
	}

	this.radianPrev = this.radianNew;
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Mouse.prototype.findHover = function(){

	if(hoveredPort) hoveredPort.hovered = false;

	hoveredPort = undefined;
	hoveredCord = undefined;

	if(outCircle.arcs.length>0){
		for(var i=0;i<2;i++){
			if(!hoveredPort && outCircle.highlighted[String(i)]){
				var index = (i+outCircle.arcOffset)%outCircle.arcs.length;
				var len = outCircle.arcs[index].ports.length;
				for(var n=0;n<len;n++){
					var xDiff = outCircle.arcs[index].ports[n].x-mouse.x;
					var yDiff = outCircle.arcs[index].ports[n].y-mouse.y;
					var absDiff = Math.sqrt(xDiff*xDiff+yDiff*yDiff);
					if(absDiff<outCircle.arcs[index].ports[n].size/2){
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
	if(!hoveredPort && inCircle.arcs.length>0){
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

	if(hoveredPort===undefined){
		// find the closest cord
		for(var h in allConnections){
			var c = allConnections[h];
			if(c.outPort.visible && c.inPort.visible && !hoveredCord){
				var outXDiff = c.outPort.x-this.x;
				var outYDiff = c.outPort.y-this.y;
				var outDist = Math.sqrt(outXDiff*outXDiff+outYDiff*outYDiff);
				if(outDist<c.dist){
					var inXDiff = c.inPort.x-this.x;
					var inYDiff = c.inPort.y-this.y;
					var inDist = Math.sqrt(inXDiff*inXDiff+inYDiff*inYDiff);
					if(inDist<c.dist){
						var distDiff = Math.abs((outDist+inDist)-c.dist);
						if(distDiff<1){
							c.hovered = true;
							hoveredCord = c;
						}
						else{
							c.hovered = false;
						}
					}
					else{
						c.hovered = false;
					}
				}
				else{
					c.hovered = false;
				}
			}
			else{
				c.hovered = false;
			}
		}
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Mouse.prototype.radiansFromCenter = function(x,y){
	var radFromCenter;
	var yDist = Math.abs(middleY-y);
	var xDist = Math.abs(middleX-x);

	if(x>middleX){
		if(y>middleY){
			// bottom right
			radFromCenter = Math.atan(yDist/xDist);
		}
		else if(y<middleY){
			// top right
			radFromCenter = Math.atan(xDist/yDist) + (Math.PI*1.5);
		}
		else{
			// we're touching the y line
			radFromCenter = 0;
		}
	}
	else if(x<middleX){
		if(y>middleY){
			// bottom left
			radFromCenter = Math.atan(xDist/yDist) + (Math.PI*.5);
		}
		else if(y<middleY){
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
		if(y>middleY){
			radFromCenter = Math.PI*.5;
		}
		else if(y<middleY){
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