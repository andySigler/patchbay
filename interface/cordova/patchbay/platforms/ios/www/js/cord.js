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

	this.wobbleCounter = Math.random()*Math.PI*2;
	this.wobbleStep = 0.05;
	this.wobbleAmount = 2;

	this.stateless = false;
	this.deathOpacity = 1;
	this.finished = false;

	this.ctx = _ctx;
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Cord.prototype.update = function(){

	if(this.stateless) {
		this.deathOpacity *= 0.97;

		if(this.deathOpacity < 0.01) {
			this.finished = true;
		}
	}

	this.x1 = this.outPort.x;
	this.y1 = this.outPort.y;
	this.x2 = this.inPort.x;
	this.y2 = this.inPort.y;

	var xDiff = this.x1-this.x2;
	var yDiff = this.y1-this.y2;
	this.dist = Math.sqrt(xDiff*xDiff+yDiff*yDiff);

	this.lineWidth = Math.max(usedSize*.003,2);

	this.wobbleCounter = (this.wobbleCounter+this.wobbleStep)%(Math.PI*2);

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

		if(this.stateless) opacity = this.deathOpacity;

		if(this.stateless) {
			this.ctx.strokeStyle = 'rgba(100,255,100,'+opacity+')';
		}
		else if(this.hovered) {
			this.ctx.strokeStyle = 'rgba(226,39,39,'+opacity+')';
		}
		else{
			this.ctx.strokeStyle = 'rgba(255,255,255,'+opacity+')';
		}
		this.ctx.fillStyle = 'rgba(255,255,255,'+opacity+')';
		this.ctx.beginPath();
		this.ctx.moveTo(this.x1,this.y1);
		this.ctx.lineTo(this.x2,this.y2);
		this.ctx.stroke();

		if(!this.stateless) {

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

				this.ctx.fillStyle = 'rgba(255,255,255,'+opacity+')';
				this.ctx.strokeStyle = 'rgba(226,39,39,'+opacity+')';

				var tempDeleteSize = this.deleteSize + (Math.sin(this.wobbleCounter)*this.wobbleAmount);
				var tempSize = tempDeleteSize * opacity;

				this.ctx.translate(this.deleteX,this.deleteY);
				this.ctx.rotate(Math.PI/4);

				this.ctx.lineWidth = tempDeleteSize*.15;

				this.ctx.beginPath();
				this.ctx.arc(0,0,tempSize/2,0,Math.PI*2,false);
				this.ctx.fill();
				this.ctx.stroke();

				this.ctx.beginPath();
				this.ctx.moveTo(0,tempSize*.3);
				this.ctx.lineTo(0,-tempSize*.3);
				this.ctx.stroke();

				this.ctx.rotate(-Math.PI/2);

				this.ctx.beginPath();
				this.ctx.moveTo(0,tempSize*.3);
				this.ctx.lineTo(0,-tempSize*.3);
				this.ctx.stroke();

				this.ctx.restore();
			}
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