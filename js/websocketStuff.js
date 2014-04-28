////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

var host, ws;

function setupWebsockets(){
	host = location.origin.replace(/^http/, 'ws');
	ws = new WebSocket(host);
	ws.onopen = function(){
		console.log("WebSocket Connection made with "+host);
	}

	ws.onmessage = function(data){
		var msg = JSON.parse(data.data);
		//wsHandlers[msg.type](msg.packet);
	}
}

var receivedStuff;

var wsHandlers = {
	'clone': function(data){
		receivedStuff = data;
		updateNodes(data.nodes);
		updateConnections(data.connections,data.testerStuff);
	},
	'testerValue': function(data){
		tester.inputs[data.index].handleValue(data.value);
	}
};

function sendRoute(receiveID,senderID,inputIndex,outputIndex){
	var msg = {
		'type':'route',
		'data':{
			'receiveID':Number(receiveID),
			'senderID':Number(senderID),
			'inputIndex':Number(inputIndex),
			'outputIndex':Number(outputIndex)
		}
	};
	//ws.send(JSON.stringify(msg));
	testConnectionExistence(receiveID,senderID,inputIndex,outputIndex); // for while in GUI debugging
}

function updateConnections(router,testerStuff){

	for(var c in allConnections){
		allConnections[c].exists = false;
	}

	for(var i in router){
		for(var n in router[i]){
			for(var b=0;b<router[i][n].length;b++){
				if(router[i][n][b]!=99 && router[i][n][b]!=""){
					var outputArcID = Number(i);
					var inputArcID = Number(n);
					if(inputArcID==0) inputArcID = outputArcID;
					var inIndex = Number(b);
					var outIndex = Number(router[i][n][b]);
					testConnectionExistence(outputArcID,inputArcID,inIndex,outIndex);
				}
			}
		}
	}

	for(var c in allConnections){
		if(!allConnections[c].exists){
			delete allConnections[c];
		}
	}
}

function testConnectionExistence(outputID,inputID,inputIndex,outputIndex){
	var tempName = Number(outputID)+'/'+Number(inputID)+'__'+Number(inputIndex)+'/'+Number(outputIndex);
	console.log(tempName);
	if(!allConnections[tempName]){
		var outPort = undefined;
		var inPort = undefined;
		for(var h=0;h<outCircle.arcs.length;h++){
			if(outCircle.arcs[h].id==outputID){
				outPort = outCircle.arcs[h].ports[outputIndex];
			}
			if(inCircle.arcs[h].id==inputID){
				inPort = inCircle.arcs[h].ports[inputIndex];
			}
			if(outPort && inPort){
				console.log(outPort.parent.name);
				allConnections[tempName] = new Cord(context,outPort,inPort,tempName);
				break;
			}
		}
	}
	else{
		allConnections[tempName].exists = true;
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////