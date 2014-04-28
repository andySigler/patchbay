////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function Cord(_ctx,outPort,inPort,name){
	this.x1,this.y1,this.x2,this.y2;
	this.lineWidth = 5;
	this.stroke;

	this.name = name;

	this.outPort = outPort;
	this.inPort = inPort;

	this.exists = true;
	this.hovered = false;

	this.ctx = _ctx;
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Cord.prototype.update = function(){
	this.x1 = this.outPort.x;
	this.y1 = this.outPort.y;
	this.x2 = this.inPort.x;
	this.y2 = this.inPort.y;

	var xDiff = this.x1-this.x2;
	var yDiff = this.y1-this.y2;
	this.dist = Math.sqrt(xDiff*xDiff+yDiff*yDiff);
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Cord.prototype.draw = function(){
	if(this.outPort.visible && this.inPort.visible){
		this.ctx.save();
		var opacity = Math.min(this.outPort.scaler,this.inPort.scaler)*1.5;
		this.ctx.lineWidth = Math.floor(this.lineWidth*opacity);
		if(this.hovered) this.ctx.strokeStyle = 'red';
		else this.ctx.strokeStyle = 'rgba(0,0,0,'+opacity+')';
		this.ctx.beginPath();
		this.ctx.moveTo(this.x1,this.y1);
		this.ctx.lineTo(this.x2,this.y2);
		this.ctx.stroke();
		this.ctx.restore();
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Cord.prototype.onHover = function(){
	//
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////