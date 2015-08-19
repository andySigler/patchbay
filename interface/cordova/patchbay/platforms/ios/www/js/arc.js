////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function Arc(_ctx,_parent,_type,_color,_name,_uuid,_id,_index){
	this.focused = false;

	this.ctx = _ctx;

	this.type = _type;
	this.parent = _parent;
	this.c = _color;

	this.index = _index;

	this.name = _name;
	this.uuid = _uuid;

	this.id = _id;

	this.touched = false;

	this.start;
	this.end;
	this.radius;
	this.portSize;

	this.ports = [];

	this.test = true;

	this.scaler = 0;
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

	var portArray = data[this.type];

	if(portArray && portArray.length>0) {

		// we're empty, so make some ports
		if(this.ports.length==0){
			for(var i=0;i<portArray.length;i++){
				this.addPort(i);
			}
		}

		// update all the ports every time
		for(var i=0;i<portArray.length;i++){
			if(portArray[i].name) {
				this.ports[i].name = portArray[i].name; // save the name
			}
			else if(!this.ports[i].name){
				var startString = 'in';
				if(this.type.indexOf('output')===0) startString = 'out';
				this.ports[i].name = startString+'-'+i;
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

	if(this.parent.type==='output'){
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

Arc.prototype.drawArc = function(parentLineWidth,shouldDrawGray){

	this.ctx.save();

	this.ctx.strokeStyle = 'rgb('+this.c.r+','+this.c.g+','+this.c.b+')';

	if(this.ports.length>0){

		this.ctx.lineWidth = Math.max(parentLineWidth*.65,1);

		// draw a thick arc
		this.ctx.beginPath();
		this.ctx.arc(0,0,this.radius,this.start,this.end,false);

		this.ctx.stroke();

		if(this.parent.type==='input' && (shouldDrawGray||this.isSelected)){
			// draw a white arc in the middle of the main arc
			this.ctx.lineWidth = Math.max(parentLineWidth*.45,1);

			var gutter = Math.PI*.012;
			this.ctx.strokeStyle = 'rgb(39,39,39)';
			this.ctx.beginPath();
			this.ctx.arc(0,0,this.radius,this.start+gutter,this.end-gutter,false);
			this.ctx.stroke();
		}
	}
	else{
		this.ctx.lineWidth = Math.max(parentLineWidth*.1,1);

		// draw a thick arc
		this.ctx.beginPath();
		this.ctx.arc(0,0,this.radius,this.start,this.end,false);

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

	var cuttoff = .85;
	var multiplier = 1.7;
	scaler*=multiplier;
	if(scaler>cuttoff) scaler = cuttoff;
	if(scaler<0) scaler = 0;

	scaler*=scaler;

	this.scaler = scaler/cuttoff;

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
			if(absDiff<this.ports[i].size*.4*scaler){
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