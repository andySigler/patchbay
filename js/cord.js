////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function Cord(_ctx,outPort,inPort,name){
	this.x1,this.y1,this.x2,this.y2;
	this.lineWidth = 2;
	this.stroke;

	this.name = name;

	this.outPort = outPort;
	this.inPort = inPort;

	this.exists = true;
	this.hovered = false;

	this.deleteX = 0;
	this.deleteY = 0;
	this.deleteSize = this.inPort.size*.4;

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

	this.deleteSize = this.inPort.size*.4;
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Cord.prototype.draw = function(){
	if(this.outPort.visible && this.inPort.visible){
		this.ctx.save();
		var opacity = Math.min(this.outPort.scaler,this.inPort.scaler)*1.5;
		this.ctx.lineWidth = Math.floor(this.lineWidth*opacity*2);
		this.ctx.strokeStyle = 'rgba(255,255,255,'+opacity+')';
		this.ctx.fillStyle = 'rgba(255,255,255,'+opacity+')';
		this.ctx.beginPath();
		this.ctx.moveTo(this.x1,this.y1);
		this.ctx.lineTo(this.x2,this.y2);
		this.ctx.stroke();

		this.ctx.beginPath();
		var circleSize =  Math.floor(this.lineWidth*opacity*3);
		this.ctx.arc(this.x1,this.y1,circleSize,0,Math.PI*2,false);
		this.ctx.fill();
		this.ctx.arc(this.x2,this.y2,circleSize,0,Math.PI*2,false);
		this.ctx.fill();
		this.ctx.restore();

		if(this.hovered){
			this.deleteX = ((this.x1-this.x2)/2)+this.x2;
			this.deleteY = ((this.y1-this.y2)/2)+this.y2;

			this.ctx.save();

			this.ctx.strokeStyle = 'rgba(255,0,0,'+opacity+')';
			var tempSize = this.deleteSize * opacity;

			this.ctx.translate(this.deleteX,this.deleteY);
			this.ctx.rotate(Math.PI/4);

			this.ctx.lineWidth = 4;

			this.ctx.beginPath();
			this.ctx.moveTo(0,tempSize/2);
			this.ctx.lineTo(0,-tempSize/2);
			this.ctx.stroke();

			this.ctx.rotate(-Math.PI/2);

			this.ctx.beginPath();
			this.ctx.moveTo(0,tempSize/2);
			this.ctx.lineTo(0,-tempSize/2);
			this.ctx.stroke();

			this.ctx.lineWidth = 2;

			this.ctx.beginPath();
			this.ctx.arc(0,0,tempSize/2,0,Math.PI*2,false);
			this.ctx.stroke();

			this.ctx.restore();
		}
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