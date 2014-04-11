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

Port.prototype.draw = function(){
	var divider = 2;
	if(this.touched){
		divider = 1;
	}
	this.ctx.beginPath();
	this.ctx.arc(0,this.circleRad,this.size/divider,0,Math.PI*2,false);
	this.ctx.fill();

	if(this.hovered){
		this.ctx.save();
		this.ctx.lineWidth = this.ctx.lineWidth/2;
		this.ctx.strokeStyle = 'black';
		this.ctx.beginPath();
		this.ctx.arc(0,this.circleRad,this.size/(divider*.75),0,Math.PI*2,false);
		this.ctx.stroke();
		this.ctx.restore();
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////