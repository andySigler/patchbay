////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function Arc(_ctx,_parent,_type,_color,_name,_id,_index){
	this.focused = false;

	this.ctx = _ctx;

	this.type = _type;
	this.parent = _parent;
	this.c = _color;

	this.index = _index;

	this.name = _name;
	this.id = _id;

	this.touched = false;

	this.start;
	this.end;
	this.radius;
	this.portSize;

	this.ports = [];

	this.test = true;
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Arc.prototype.addPort = function(index){
	var tempPort = new Port(this.ctx,this,this.type,index);
	this.ports.push(tempPort);
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Arc.prototype.handleMeta = function(data){
	if(this.ports.length==0){
		for(var i=0;i<Number(data.totalPorts[this.type]);i++){
			this.addPort(i);
		}
	}
	else if(this.test){
		for(var i in data.ports[this.type]){
			for(var p=0;p<this.ports.length;p++){
				if(data.ports[this.type][i] && this.ports[p].index==data.ports[this.type][i].index){
					this.ports[p].name = data.ports[this.type][i].name;
					break;
				}
			}
		}
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Arc.prototype.update = function(start,end,radius,portSize,padding,isSelected){

	this.start = start + padding;
	this.end = end - padding;

	if(this.parent.type==='out'){
		if(theWidth<theHeight){
			this.start = (this.start+(Math.PI*1.75))%(Math.PI*2);
			this.end = (this.end+(Math.PI*1.75))%(Math.PI*2);
		}
		else{
			this.start = (this.start+(Math.PI*.25))%(Math.PI*2);
			this.end = (this.end+(Math.PI*.25))%(Math.PI*2);
		}
	}
	else{
		if(theWidth<theHeight){
			this.start = (this.start+(Math.PI*.75))%(Math.PI*2);
			this.end = (this.end+(Math.PI*.75))%(Math.PI*2);
		}
		else{
			this.start = (this.start+(Math.PI*1.25))%(Math.PI*2);
			this.end = (this.end+(Math.PI*1.25))%(Math.PI*2);
		}
	}
	if(theHeight<theWidth){
		this.start = (this.start+Math.PI*1.5)%(Math.PI*2);
		this.end = (this.end+Math.PI*1.5)%(Math.PI*2);
	}

	this.radius = radius;
	this.portSize = portSize;
	this.isSelected = isSelected;

	if(this.end<this.start) this.end+=Math.PI*2;

	if(this.isSelected){
		this.updatePorts();
	}
	else{
		for(var i=0;i<this.ports.length;i++){
			if(this.ports[i]){
				this.ports[i].visible = false;
			}
		}
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Arc.prototype.drawArc = function(parentLineWidth){

	this.ctx.save();

	if(this.isSelected) this.ctx.strokeStyle = 'rgb('+this.c.r+','+this.c.g+','+this.c.b+')';
	else this.ctx.strokeStyle = 'rgb(236,236,236)';

	if(this.parent.type==='in'){
		this.ctx.lineWidth = parentLineWidth*.65;

		// draw a thick arc
		this.ctx.beginPath();
		this.ctx.arc(0,0,this.radius,this.start,this.end,false);

		this.ctx.stroke();
	}
	else{
		this.ctx.lineWidth = parentLineWidth*.1;
		// draw two thin arcs
		this.ctx.beginPath();
		this.ctx.arc(0,0,this.radius*.94,this.start,this.end,false);

		this.ctx.stroke();

		this.ctx.beginPath();
		this.ctx.arc(0,0,this.radius*1.06,this.start,this.end,false);

		this.ctx.stroke();
	}

	this.ctx.restore();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Arc.prototype.drawName = function(lineWidth){

	this.ctx.save();

	this.ctx.rotate(this.start+(this.rotStep/2));

	for(var i=0;i<this.ports.length;i++){
		if(this.ports[i]){
			this.ports[i].drawName(lineWidth);
			this.ctx.rotate(this.rotStep);
		}
	}
	this.ctx.restore();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Arc.prototype.updatePorts = function(){

	this.rotStep = (this.end-this.start)/this.ports.length;

	for(var i=0;i<this.ports.length;i++){
		if(this.ports[i]){
			this.ports[i].visible = true;
			this.ports[i].radLocation = this.start+(this.rotStep*i)+(this.rotStep/2);
			this.ports[i].update(this.radius,this.portSize);
		}
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Arc.prototype.drawPorts = function(scaler){
	this.ctx.save();

	this.ctx.rotate(this.start+(this.rotStep/2)-(Math.PI*.5));

	for(var i=0;i<this.ports.length;i++){
		if(this.ports[i]){
			this.ports[i].draw(scaler);
			this.ctx.rotate(this.rotStep);
		}
	}
	this.ctx.restore();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Arc.prototype.isTouchingPort = function(x,y,scaler){

	for(var i=0;i<this.ports.length;i++){
		if(this.ports[i]){
			var xDiff = this.ports[i].x-x;
			var yDiff = this.ports[i].y-y;
			var absDiff = Math.sqrt(xDiff*xDiff+yDiff*yDiff);
			if(absDiff<this.ports[i].size*.5*scaler){
				this.ports[i].touched = true;
				touchedPort = this.ports[i];
				return true;
			}
		}
	}
	return false;
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////