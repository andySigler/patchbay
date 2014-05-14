////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function NameBlock(_ctx,_circle){
	this.x = undefined;
	this.y = undefined;
	this.width = undefined;
	this.height = undefined;
	this.ctx = _ctx;
	this.circle = _circle;
	this.touched = false;
}

NameBlock.prototype.update = function(){
}

NameBlock.prototype.draw = function(){
	if(this.ctx){
		this.ctx.save();
		// this.ctx.strokeStyle = 'red';
		// this.ctx.strokeRect(this.x,this.y,this.width,this.height);

		this.ctx.textAlign = 'center';

		var inLen = this.circle.arcs.length;
		var outLen = outCircle.arcs.length;

		if(theHeight>theWidth){

			var fontSize = 24;
			var textSpace = fontSize*6;
			this.ctx.font = fontSize+'px Helvetica';

			// inner circle

			var innerY = this.y+(this.height*.333);
			var xFocus = this.x+(this.width*.5)+(textSpace*this.circle.animPercent);

			var i = this.circle.arcOffset;
			for(var x=xFocus;x<this.width;x+=textSpace){
				if(i<0 || i>=inLen) break;
				var xPos = x;
				if(this.circle.type==='out') xPos = this.width-x;		
				var opacity = Math.pow(1-((Math.cos((xPos/this.width)*Math.PI*2)+1)/2),2);		
				this.ctx.fillStyle = 'rgba('+this.circle.arcs[i].c.r+','+this.circle.arcs[i].c.g+','+this.circle.arcs[i].c.b+','+opacity+')';
				if(this.circle.type==='in'){
					this.ctx.fillRect(xPos-textSpace/2,this.y,textSpace,this.height);
					this.ctx.fillStyle = 'white';
				}
				else{
					this.ctx.strokeStyle = 'rgba('+this.circle.arcs[i].c.r+','+this.circle.arcs[i].c.g+','+this.circle.arcs[i].c.b+','+opacity+')';
					var tempLineWidth = usedSize*.02;
					this.ctx.lineWidth = tempLineWidth;
					this.ctx.beginPath();
					this.ctx.moveTo(xPos-textSpace/2,this.y);
					this.ctx.lineTo(xPos+textSpace/2,this.y);
					this.ctx.moveTo(xPos-textSpace/2,this.y+(this.height-tempLineWidth/2));
					this.ctx.lineTo(xPos+textSpace/2,this.y+(this.height-tempLineWidth/2));
					this.ctx.stroke();
				}
				this.ctx.fillText(this.circle.arcs[i].name,xPos,innerY+fontSize*.6);
				i = (i-1);
				if(i<0)i=inLen-1;
			}
			i = this.circle.arcOffset+1;
			if(i>=inLen) i = 0;
			for(var x=xFocus-textSpace;x>=-textSpace;x-=textSpace){
				if(i<0 || i>=inLen) break;
				var xPos = x;
				if(this.circle.type==='out') xPos = this.width-x;	
				var opacity = Math.pow(1-((Math.cos((xPos/this.width)*Math.PI*2)+1)/2),2);			
				this.ctx.fillStyle = 'rgba('+this.circle.arcs[i].c.r+','+this.circle.arcs[i].c.g+','+this.circle.arcs[i].c.b+','+opacity+')';
				if(this.circle.type==='in'){
					this.ctx.fillRect(xPos-textSpace/2,this.y,textSpace,this.height);
					this.ctx.fillStyle = 'white';
				}
				else{
					this.ctx.strokeStyle = 'rgba('+this.circle.arcs[i].c.r+','+this.circle.arcs[i].c.g+','+this.circle.arcs[i].c.b+','+opacity+')';
					var tempLineWidth = usedSize*.02;
					this.ctx.lineWidth = tempLineWidth;
					this.ctx.beginPath();
					this.ctx.moveTo(xPos-textSpace/2,this.y);
					this.ctx.lineTo(xPos+textSpace/2,this.y);
					this.ctx.moveTo(xPos-textSpace/2,this.y+(this.height-tempLineWidth/2));
					this.ctx.lineTo(xPos+textSpace/2,this.y+(this.height-tempLineWidth/2));
					this.ctx.stroke();
				}
				this.ctx.fillText(this.circle.arcs[i].name,xPos,innerY+fontSize*.6);
				i = (i+1)%inLen;
			}
		}
		else{
			var fontSize = 24;
			var textSpace = fontSize*3;
			this.ctx.font = fontSize+'px Helvetica';

			var innerX = this.x+(this.width*.5);
			var yFocus = this.y+(this.height*.5)+(textSpace*this.circle.animPercent);

			var i = this.circle.arcOffset;
			for(var y=yFocus;y<this.height+textSpace;y+=textSpace){
				if(i>=inLen || i<0) break;	
				var yPos = y;
				if(this.circle.type==='in') yPos = this.height-y;
				var opacity = Math.pow(1-((Math.cos((yPos/this.height)*Math.PI*2)+1)/2),5);				
				this.ctx.fillStyle = 'rgba('+this.circle.arcs[i].c.r+','+this.circle.arcs[i].c.g+','+this.circle.arcs[i].c.b+','+opacity+')';
				if(this.circle.type==='in'){
					this.ctx.fillRect(this.x,yPos-textSpace/2,this.width,textSpace);
					this.ctx.fillStyle = 'white';
				}
				else{
					this.ctx.strokeStyle = 'rgba('+this.circle.arcs[i].c.r+','+this.circle.arcs[i].c.g+','+this.circle.arcs[i].c.b+','+opacity+')';
					var tempLineWidth = usedSize*.02;
					this.ctx.lineWidth = tempLineWidth;
					this.ctx.beginPath();
					this.ctx.moveTo(this.x,yPos-textSpace/2);
					this.ctx.lineTo(this.x,yPos+textSpace/2);
					this.ctx.moveTo(this.x+(this.width-tempLineWidth/2),yPos-textSpace/2);
					this.ctx.lineTo(this.x+(this.width-tempLineWidth/2),yPos+textSpace/2);
					this.ctx.stroke();
				}
				this.ctx.fillText(this.circle.arcs[i].name,innerX,yPos+fontSize*.4);
				i = (i-1);
				if(i<0) i = inLen-1;
			}
			i = this.circle.arcOffset+1;
			if(i>=inLen) i = 0;
			for(var y=yFocus-textSpace;y>=-textSpace;y-=textSpace){	
				if(i>=inLen || i<0) break;	
				var yPos = y;
				if(this.circle.type==='in') yPos = this.height-y;
				var opacity = Math.pow(1-((Math.cos((yPos/this.height)*Math.PI*2)+1)/2),5);	
				this.ctx.fillStyle = 'rgba('+this.circle.arcs[i].c.r+','+this.circle.arcs[i].c.g+','+this.circle.arcs[i].c.b+','+opacity+')';
				if(this.circle.type==='in'){
					this.ctx.fillRect(this.x,yPos-textSpace/2,this.width,textSpace);
					this.ctx.fillStyle = 'white';
				}
				else{
					this.ctx.strokeStyle = 'rgba('+this.circle.arcs[i].c.r+','+this.circle.arcs[i].c.g+','+this.circle.arcs[i].c.b+','+opacity+')';
					var tempLineWidth = usedSize*.02;
					this.ctx.lineWidth = tempLineWidth;
					this.ctx.beginPath();
					this.ctx.moveTo(this.x,yPos-textSpace/2);
					this.ctx.lineTo(this.x,yPos+textSpace/2);
					this.ctx.moveTo(this.x+(this.width-tempLineWidth/2),yPos-textSpace/2);
					this.ctx.lineTo(this.x+(this.width-tempLineWidth/2),yPos+textSpace/2);
					this.ctx.stroke();
				}
				this.ctx.fillText(this.circle.arcs[i].name,innerX,yPos+fontSize*.4);
				i = (i+1)%inLen;
			}
		}

		this.ctx.restore();
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////