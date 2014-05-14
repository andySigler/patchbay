////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function Port(_ctx,_parent,_type,_index){
	this.ctx = _ctx;

	this.parent = _parent;
	this.type = _type;
	this.name = "";

	this.index = _index;

	this.circleRad;
	this.size;
	this.radLocation;

	this.x = 0;
	this.y = 0;

	this.touched = false;
	this.hovered = false;

	this.scaler = 0;

	this.connections = {};
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Port.prototype.update = function(rad,size){
	this.circleRad = rad;
	this.size = size;

	this.x = this.circleRad * Math.cos(this.radLocation) + this.parent.parent.centerX;
	this.y = this.circleRad * Math.sin(this.radLocation) + this.parent.parent.centerY;
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Port.prototype.draw = function(scaler){

	this.scaler = scaler;

	var tempSize = this.size*scaler*.53;

	if(tempSize>2){
		this.ctx.save();

		this.ctx.strokeStyle = 'rgb(79,79,79)';
		this.ctx.fillStyle = 'rgb('+this.parent.c.r+','+this.parent.c.g+','+this.parent.c.b+')';

		this.ctx.lineWidth = Math.floor(tempSize*.2);

		this.ctx.beginPath();
		this.ctx.arc(0,this.circleRad,tempSize,0,Math.PI*2,false);

		this.ctx.fill();
		if(tempSize>4) this.ctx.stroke();

		this.ctx.restore();
	}
}

Port.prototype.drawName = function(){
	this.ctx.save();

	var radOffset = this.parent.radius-(usedSize*0.05);
	this.ctx.translate(radOffset,0);

	if(this.x<this.parent.parent.centerX){
		this.ctx.textAlign = 'left';
		this.ctx.rotate(Math.PI);
	}
	else{
		this.ctx.textAlign = 'right';
	}

	var fontSize = Math.floor(this.scaler*this.size*.4);
	this.ctx.font = fontSize+'px Helvetica';
	if(this.touched || this.hovered) this.ctx.fillStyle = 'white';
	else this.ctx.fillStyle = 'rgb('+this.parent.c.r+','+this.parent.c.g+','+this.parent.c.b+')';;

	this.ctx.fillText(this.name,0,fontSize*.2);
	this.ctx.restore();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////