////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function Arc(_ctx,_parent,_type,_color,_name,_id){
	this.focused = false;

	this.ctx = _ctx;

	this.type = _type;
	this.parent = _parent;
	this.c = _color;

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

Arc.prototype.drawArc = function(){

	this.ctx.beginPath();
	this.ctx.arc(0,0,this.radius,this.start,this.end,false);
	if(this.isSelected) this.ctx.strokeStyle = 'rgb('+this.c.r+','+this.c.g+','+this.c.b+')';
	else this.ctx.strokeStyle = 'rgb('+this.c.r+','+this.c.g+','+this.c.b+')';
	this.ctx.stroke();
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

Arc.prototype.drawName = function(lineWidth){
	if(this.isSelected){
		var fontSize = 20;
		var radDiff = this.end-this.start;
		if(radDiff<0) radDiff+=(Math.PI*2);
		var centerRad = this.start+(radDiff/2);
		var letterRotStep = Math.PI*(.15/this.radius)*fontSize;
		var nameRadSize = letterRotStep*this.name.length;

		var mult = -1;

		this.ctx.save();
		this.ctx.rotate(centerRad-((Math.PI/2)*mult)-((nameRadSize/2)*mult)); // because arcs start at the right
		this.ctx.fillStyle = 'rgb('+this.c.r+','+this.c.g+','+this.c.b+')';
		this.ctx.font = fontSize+'px Helvetica';
		for(var i=this.name.length-1;i>=0;i--){
			this.ctx.fillText(this.name.charAt(i),0,(this.radius+lineWidth+(fontSize/2*mult))*mult);
			this.ctx.rotate(letterRotStep*mult);
		}
		this.ctx.restore();
	}
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
	// var c = (this.paletteIndex+1)%colorPalette.length;
	// this.ctx.fillStyle = 'rgb('+(c.r)+','+(this.c.g)+','+(this.c.b)+')';

	for(var i=0;i<this.ports.length;i++){
		if(this.ports[i]){
			this.ports[i].radLocation = this.start+(this.rotStep*i)+(this.rotStep/2);
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
			if(absDiff<this.ports[i].size*1*scaler){
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