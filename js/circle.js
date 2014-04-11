////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function Circle(_ctx,_type,scale,thickness){
	this.radiusPercentage = scale;
	this.relativeLineWidth = thickness;
	this.lineWidth;

	this.arcOffset = 0;
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
	this.rotateFeedback = .95;

	this.padding = Math.PI/200;
	if(this.type==='out') this.padding*=.5;
	this.lineWidth;
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.update = function(screenSize){

	this.rotateDrag();

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
	this.ctx.lineWidth = this.lineWidth;

	var totalArcs = this.arcs.length;

	for(var i=0;i<totalArcs;i++){
		this.arcs[i].drawArc();
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.drawNames = function(){
	var totalArcs = this.arcs.length;

	for(var i=0;i<totalArcs;i++){
		this.arcs[i].drawName(this.lineWidth);
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.drawPorts = function(){

	var totalArcs = this.arcs.length;

	for(var i=0;i<totalArcs;i++){
		if(this.arcs[i].isSelected){
			var scaler = this.animPercent;
			if(this.arcOffset===i){
				scaler = 1-scaler;
			}
			this.arcs[i].drawPorts(scaler);
		}
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

	for(var i in this.highlighted){
		i = Number(i);
		if(this.highlighted[i]){
			var arcIndex = (i+this.arcOffset)%this.arcs.length;
			var scaler = this.animPercent*1.25;
			if(i==0) scaler = 1-scaler;
			//scaler = 1;
			if(this.arcs[arcIndex].isTouchingPort(mouseX,mouseY,scaler)){
				return false;
			}
		}
	}
	return true;
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.rotateDrag = function(){

	if(!this.touched) this.radiansMoved *= this.rotateFeedback;

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

Circle.prototype.addArc = function(name,color,id){
	var tempArc = new Arc(this.ctx,this,this.type,color,name,id);
	this.arcs.push(tempArc);
	this.updateDimensionStuff();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Circle.prototype.deleteArc = function(id){
	for(var i=0;i<this.arcs.length;i++){
		if(this.arcs[i].id===id){
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