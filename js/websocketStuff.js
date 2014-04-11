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
		wsHandlers[msg.type](msg.packet);
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

function sendRoute(receiveID,senderID,outputIndex,inputIndex){
	var msg = {
		'type':'route',
		'data':{
			'receiveID':Number(receiveID),
			'senderID':Number(senderID),
			'inputIndex':Number(inputIndex),
			'outputIndex':Number(outputIndex)
		}
	};
	ws.send(JSON.stringify(msg));
}

function sendTesterOutput(outputIndex,outputValue){
	var msg = {
		'type':'testerOutput',
		'data':{
			'index':Number(outputIndex),
			'value':Number(outputValue)
		}
	};
	ws.send(JSON.stringify(msg));
}

function updateConnections(router,testerStuff){

	for(var c in allConnections){
		allConnections[c].exists = false;
	}

	for(var i in router){
		for(var n in router[i]){
			for(var b=0;b<router[i][n].length;b++){
				if(router[i][n][b]!=99 && router[i][n][b]!=""){
					var inputArcID = Number(i);
					var outputArcID = Number(n);
					if(outputArcID==0) outputArcID = inputArcID;
					var outIndex = Number(b);
					var inIndex = Number(router[i][n][b]);
					testConnectionExistence(outputArcID,inputArcID,outIndex,inIndex);
				}
			}
		}
	}

	for(var t in testerStuff.inPorts){
		for(var r in testerStuff.inPorts[t]){
			testConnectionExistence(r,-1,testerStuff.inPorts[t][r],t);
		}
	}
	for(var t in testerStuff.outPorts){
		for(var r in testerStuff.outPorts[t]){
			testConnectionExistence(-1,r,t,testerStuff.outPorts[t][r]);
		}
	}

	for(var c in allConnections){
		if(!allConnections[c].exists){
			delete allConnections[c];
		}
	}
}

function testConnectionExistence(outputID,inputID,outputIndex,inputIndex){
	var tempName = Number(outputID)+'/'+Number(inputID)+'__'+Number(outputIndex)+'/'+Number(inputIndex);

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