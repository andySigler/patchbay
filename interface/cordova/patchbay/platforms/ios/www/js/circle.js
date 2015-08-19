////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function Circle(_ctx,_type,scale,thickness){
	this.radiusPercentage = scale;
	this.relativeLineWidth = thickness;
	this.lineWidth;

	this.arcOffset = 0;
	this.targetOffset = 0;
	this.isAutoMoving = false;
	this.autoStepTotal = 20;
	this.autoStepCount = 0;
	this.autoStepSize = 0;
	this.targetArc = 0;

	this.highlighted = {
		0:true,
		1:false
	};

	this.animPercent = 0;
	this.animDirection = -1;

	this.touched = false;

	this.ctx = _ctx;

	this.type = _type;

	this.arcs = [];

	this.arcEndPoints = [];

	this.radiansMoved = 0;
	this.rotateFeedback = .85;

	this.padding = Math.PI/100;
	if(this.type==='output') this.padding*=.5;
	this.lineWidth;
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.update = function(screenSize){

	if(this.isAutoMoving) this.updateAutoMoving();
	else this.rotateDrag();

	var totalArcs = this.arcs.length;
	if(totalArcs>0 && this.arcOffset<totalArcs){
		this.lineWidth = Math.floor(this.relativeLineWidth*screenSize);

		var points = this.transpose(0);
		this.arcs[this.arcOffset].update(points[0],points[1],this.radiusPercentage*screenSize,this.lineWidth,this.padding,this.highlighted[0]);

		var smallerWidth = Math.PI/(totalArcs-1);
		for(var i=1;i<totalArcs;i++){
			var index = (i+this.arcOffset)%totalArcs;
			var points = this.transpose(i);
			this.arcs[index].update(points[0],points[1],this.radiusPercentage*screenSize,this.lineWidth,this.padding,this.highlighted[i]);
		}
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.drawArcs = function(){
	if(this.arcs.length>0){
		this.ctx.save();
		this.ctx.translate(this.centerX,this.centerY);

		var tempScaler = Math.floor(usedSize*.03);
		var fontSize = tempScaler;
		this.ctx.font = fontSize+'px Helvetica';
		this.ctx.textAlign = 'center';
		var labelOffsetY = tempScaler*2;
		if(this.type=='input') labelOffsetY *= -1;
		this.ctx.fillStyle = 'black';
		this.ctx.fillText(this.type.toUpperCase(),0,labelOffsetY);

		tempScaler = Math.floor(usedSize*.05);
		fontSize = tempScaler;
		this.ctx.font = fontSize+'px Helvetica';

		// then draw the currently displayed arc's name
		var xOffsetScaler = 0.05;

		var arc_0 = this.arcs[this.arcOffset];
		tempScaler = Math.floor(usedSize*.05);
		fontSize = tempScaler*arc_0.scaler;
		this.ctx.font = fontSize+'px Helvetica';
		var name_0 = arc_0.name;
		var opacity = arc_0.scaler;
		if(opacity>1) opacity = 1;
		this.ctx.fillStyle = 'rgba('+arc_0.c.r+','+arc_0.c.g+','+arc_0.c.b+','+opacity+')';
		var xOffset_0;
		if(arc_0.type=='input'){
			xOffset_0 = (this.lineWidth*tempScaler*xOffsetScaler)*this.animPercent;
		}
		else{
			xOffset_0 = (-this.lineWidth*tempScaler*xOffsetScaler)*this.animPercent;
		}
		this.ctx.fillText(name_0,xOffset_0*1.5,0);

		if(this.arcs.length>1) {

			var nextIndex = (this.arcOffset+1)%this.arcs.length;
			var arc_1 = this.arcs[nextIndex]
			var name_1 = arc_1.name;
			opacity = arc_1.scaler;
			if(opacity>1) opacity = 1;
			this.ctx.fillStyle = 'rgba('+arc_1.c.r+','+arc_1.c.g+','+arc_1.c.b+','+opacity+')';
			var xOffset_1;
			if(arc_1.type=='input'){
				xOffset_1 = (-this.lineWidth*tempScaler*xOffsetScaler)*(1-this.animPercent);
			}
			else{
				xOffset_1 = (this.lineWidth*tempScaler*xOffsetScaler)*(1-this.animPercent);
			}
			fontSize = tempScaler*arc_1.scaler;
			this.ctx.font = fontSize+'px Helvetica';
			this.ctx.fillText(name_1,xOffset_1*1.5,0);

		}


		var totalArcs = this.arcs.length;
		var shouldDrawGrey = true;
		if(totalArcs>20) shouldDrawGrey = false;
		for(var i=0;i<totalArcs;i++){
			this.arcs[i].drawArc(this.lineWidth,shouldDrawGrey);
		}

		this.ctx.restore();
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.drawNames = function(){
	this.ctx.save();
	this.ctx.translate(this.centerX,this.centerY);
	if(!touchedPort || (touchedPort&&touchedPort.type!=this.type)){
		var totalArcs = this.arcs.length;

		for(var i=0;i<totalArcs;i++){
			if(this.arcs[i].isSelected){
				this.arcs[i].drawName(this.lineWidth);
			}
		}
	}
	else{
		this.ctx.save();
		this.ctx.rotate(touchedPort.parent.start+(touchedPort.parent.rotStep/2));
		this.ctx.rotate(touchedPort.parent.rotStep*touchedPort.index);
		touchedPort.drawName(this.lineWidth);
		this.ctx.restore();
	}
	this.ctx.restore();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.drawPorts = function(){
	this.ctx.save();
	this.ctx.translate(this.centerX,this.centerY);

	var totalArcs = this.arcs.length;

	for(var i=0;i<totalArcs;i++){
		if(this.arcs[i].isSelected){
			var scaler = this.animPercent;
			if(this.arcOffset===i){
				scaler = 1-scaler;
			}
			if(!touchedPort){
				this.arcs[i].drawPorts(scaler);
			}
			else if(touchedPort.parent===this.arcs[i] || touchedPort.parent.type!=this.type){
				this.arcs[i].drawPorts(scaler);
			}
		}
	}

	this.ctx.restore();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.startAutoMove = function(newOffset){
	this.targetOffset = newOffset;
	this.isAutoMoving = true;

	var moveUp = newOffset - (this.arcOffset+this.arcs.length);
	var moveDown = newOffset - this.arcOffset;

	var amountToMove = moveUp-this.animPercent;
	if(Math.abs(moveUp)>Math.abs(moveDown)){
		if(Math.abs(moveDown)>this.arcs.length/2){
			amountToMove = moveDown+this.arcs.length+this.animPercent;
		}
		else if(moveDown===0){
			amountToMove = (moveDown-this.animPercent)%this.arcs.length;
		}
		else{
			amountToMove = (moveDown+this.animPercent)%this.arcs.length;
		}
	}

	this.autoStepSize = amountToMove/this.autoStepTotal;
	this.autoStepCount = 0;

	// if(this.arcs[this.arcOffset]) this.arcs[this.arcOffset].scaler = 0;
	// this.arcOffset = newOffset;
	// this.animPercent = 0;
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.updateAutoMoving = function(){
	if(this.autoStepCount<this.autoStepTotal){
		this.animPercent += this.autoStepSize;
		this.autoStepCount++;
		if(this.animPercent>=1){
			this.arcOffset-=this.animDirection;
			if(this.arcOffset>=this.arcs.length) this.arcOffset = 0;
			else if(this.arcOffset<0) this.arcOffset = this.arcs.length-1;
			this.animPercent = 0;
		}

		else if(this.animPercent<0){
			this.arcOffset+=this.animDirection;
			if(this.arcOffset>=this.arcs.length) this.arcOffset = 0;
			else if(this.arcOffset<0) this.arcOffset = this.arcs.length-1;
			this.animPercent = 1+this.animPercent;
		}
	}
	else{
		this.isAutoMoving = false;
		this.arcOffset = this.targetOffset;
		this.animPercent = 0;
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.transpose = function(i){

	var realStart = this.arcEndPoints[i].start;
	var realEnd = this.arcEndPoints[i].end;

	var target = i+this.animDirection;
	if(target<0) target = this.arcs.length+target;
	else if(target>=this.arcs.length) target = target%this.arcs.length;

	var destStart = this.arcEndPoints[target].start;
	var destEnd = this.arcEndPoints[target].end;

	var startDiff = (destStart-realStart);
	var endDiff = (destEnd-realEnd);

	if(i===0 && this.animDirection===1){
		startDiff = startDiff*-1;
		endDiff = endDiff+(Math.PI*2);
	}
	else if(i===1 && this.animDirection===-1){
		startDiff = startDiff*-1;
		endDiff = (Math.PI*-2)+endDiff;
	}

	var currentStart = (startDiff*this.animPercent)+realStart;
	var currentEnd = (endDiff*this.animPercent)+realEnd;

	if(currentStart>Math.PI*2) currentStart = currentStart%(Math.PI*2);
	else if(currentStart<0) currentStart+=(Math.PI*2);
	if(currentEnd>Math.PI*2) currentEnd = currentEnd%(Math.PI*2);
	else if(currentEnd<0) currentEnd+=(Math.PI*2);

	var highlightCuttoff = 1/50;
	if(this.animPercent>=0 && this.animPercent<highlightCuttoff){
		this.highlighted = {
			0:true,
			1:false
		};
	}
	else if(this.animPercent>=highlightCuttoff && this.animPercent<.5){
		this.highlighted = {
			0:true,
			1:true
		};
	}
	else if(this.animPercent>=.5 && this.animPercent<1-highlightCuttoff){
		this.highlighted = {
			0:true,
			1:true
		};
	}
	else if(this.animPercent>=1-highlightCuttoff && this.animPercent<1){
		this.highlighted = {
			0:false,
			1:true
		};
	}

	return [currentStart,currentEnd];
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.mouseEvent = function(mouseX,mouseY){

	var portTouched = false;

	for(var i in this.highlighted){
		i = Number(i);
		if(this.highlighted[i]){
			var arcIndex = (i+this.arcOffset)%this.arcs.length;
			var scaler = this.animPercent*1.25;
			if(i==0) scaler = 1-scaler;
			//scaler = 1;
			if(this.arcs[arcIndex].isTouchingPort(mouseX,mouseY,scaler)){
				this.touched = false;
				portTouched = true;
			}
		}
	}
	if(!portTouched){
		this.touched = true;
		// see wich arc was touched
		for(var n=0;n<this.arcs.length;n++){
			var compRad = this.type=='input' ? mouse.in_radianNew : mouse.out_radianNew;
			if(n==this.arcOffset && this.type=='input'){
				compRad += (Math.PI*2);
			}
			if(compRad>this.arcs[n].start&&compRad<this.arcs[n].end){
				this.arcs[n].touched = true;
				break;
			}
		}
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.rotateDrag = function(){

	if(this.radiansMoved>Math.PI/2) this.radiansMoved = (Math.PI-(this.radiansMoved%Math.PI))*-1;
	if(this.radiansMoved<-Math.PI/2) this.radiansMoved = (Math.PI-(Math.abs(this.radiansMoved)%Math.PI));

	if(!this.touched){
		this.radiansMoved *= this.rotateFeedback;
	}

	var relativeMovement = this.radiansMoved/(Math.PI*2);
	if(relativeMovement>.5) relativeMovement = 1-(relativeMovement%1);
	else if(relativeMovement<-.5) relativeMovement = 1+(relativeMovement%1);

	if(relativeMovement&&relativeMovement<1&&relativeMovement>-1){

		if(Math.abs(relativeMovement)<0) this.direction = -1;
		else this.direction = 1;

		var animStep = relativeMovement / (1/this.arcs.length);
		this.animPercent-=animStep;

		if(this.animPercent>=1){
			this.arcOffset-=this.animDirection;
			if(this.arcOffset>=this.arcs.length) this.arcOffset = 0;
			else if(this.arcOffset<0) this.arcOffset = this.arcs.length-1;
			this.animPercent = 0;
		}

		else if(this.animPercent<0){
			this.arcOffset+=this.animDirection;
			if(this.arcOffset>=this.arcs.length) this.arcOffset = 0;
			else if(this.arcOffset<0) this.arcOffset = this.arcs.length-1;
			this.animPercent = 1+this.animPercent;
		}
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.addArc = function(name,color,uuid,id){
	var tempArc = new Arc(this.ctx,this,this.type,color,name,uuid,id,this.arcs.length);
	this.arcs.push(tempArc);
	this.updateDimensionStuff();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.deleteArc = function(id){
	for(var i=0;i<this.arcs.length;i++){
		if(this.arcs[i].uuid===id){
			this.arcs.splice(i,1);
			break;
		}
	}
	if(this.arcOffset>=this.arcs.length && this.arcOffset>0) this.arcOffset = this.arcs.length-1;
	this.updateDimensionStuff();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.updateDimensionStuff = function(){
	this.arcEndPoints = [];

	if(this.arcs.length===1){
		this.arcEndPoints = [
			{
				'start':Math.PI/2,
				'end':Math.PI/2
			}
		];
	}
	else if(this.arcs.length===2){
		this.arcEndPoints = [
			{
				'start':Math.PI,
				'end':Math.PI*2
			},
			{
				'start':0,
				'end':Math.PI
			},
		];
	}
	else{
		this.arcEndPoints[0] = {
			'start':Math.PI,
			'end':Math.PI*2
		};
		var smallerWidth = Math.PI/(this.arcs.length-1);
		for(var i=1;i<this.arcs.length;i++){
			this.arcEndPoints[i] = {
				'start':(i-1)*smallerWidth,
				'end':i*smallerWidth
			};
		}
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////