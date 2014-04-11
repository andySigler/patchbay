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

	this.x;
	this.y;

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

	this.x = this.circleRad * Math.cos(this.radLocation) + middleX;
	this.y = this.circleRad * Math.sin(this.radLocation) + middleY;
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Port.prototype.draw = function(scaler){
	scaler*=1.25;
	if(scaler>1) scaler = 1;
	else if(scaler<0) scaler = 0;

	this.scaler = scaler;

	var tempSize = this.size*scaler*.5;

	this.ctx.fillStyle = 'white';
	this.ctx.beginPath();
	this.ctx.arc(0,this.circleRad,tempSize,0,Math.PI*2,false);
	this.ctx.fill();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////