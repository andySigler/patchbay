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
	this.x1 = this.outPort.x-middleX;
	this.y1 = this.outPort.y-middleY;
	this.x2 = this.inPort.x-middleX;
	this.y2 = this.inPort.y-middleY;

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
		this.ctx.lineWidth = this.lineWidth;
		if(this.hovered) this.ctx.strokeStyle = 'red';
		else this.ctx.strokeStyle = 'black';
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