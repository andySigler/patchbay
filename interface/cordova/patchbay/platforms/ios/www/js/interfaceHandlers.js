////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function updateScanButton(state) {
	var butt = document.getElementById('scanButton');
	butt.currentState = state ? true : false;

	if(butt.currentState) {
		butt.style.color = 'rgb(100,255,100)';
		butt.innerHTML = 'Scan ON';
	}
	else {
		butt.style.color = 'gray';
		butt.innerHTML = 'Scan OFF';
	}
}

function setupUI(){

	var butt = document.getElementById('scanButton');

	updateScanButton(false);

	var hammerTime = Hammer(butt);
	hammerTime.on('touch',function(event){
		var msg = {
			'type' : 'scan',
			'data' : {
				'state' : !butt.currentState
			}
		};

		if(!butt.currentState) startListening();
		else stopListening();
	});
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

var receivedStuff;

var wsHandlers = {
	'sync' : function (data){

		receivedStuff = data;

		// passes total port amount for each node, and eventually a name for each port
		updateNodes(data.scene);

		if(data.discovering) {
			document.getElementById('discovery').style.display = 'inline-block';
		}
		else {
			document.getElementById('discovery').style.display = 'none';
		}

		// // passes master list of all connections (between an input and an output)
		updateConnections(data.scene);

		// then check if we're scanning or not
		updateScanButton(data.scan)
	}
};

//////////////
//////////////
//////////////

function flushScene() {
	var msg = {
		'type' : 'flush',
		'data' : {}
	};

	console.log(msg);
}

//////////////
//////////////
//////////////

function readLinks(uuid) {
	var msg = {
		'type' : 'readlinks',
		'data' : {
			'uuid' : uuid
		}
	};

	console.log(msg);
}

//////////////
//////////////
//////////////

function refresh(){
	while(outCircle.arcs.length) {
		outCircle.deleteArc(outCircle.arcs[0].uuid);
		inCircle.deleteArc(inCircle.arcs[0].uuid);
	}

	var msg = {
		'type' : 'refresh',
		'data' : {}
	};

	console.log(msg);
}

////////////
////////////
////////////

function sendRoute(outputUUID, inputUUID, inputIndex, outputIndex, isAlive){

	var inputID = undefined;
	var outputID = undefined;

	var inPort = undefined;
	var outPort = undefined;

	for(var o=0;o<inCircle.arcs.length;o++) {
		if(inCircle.arcs[o].uuid===inputUUID && inputIndex<inCircle.arcs[o].ports.length) {
			inputID = Number(inCircle.arcs[o].id);
			inPort = inCircle.arcs[o].ports[inputIndex];
		}
	}

	for(var o=0;o<outCircle.arcs.length;o++) {
		if(outCircle.arcs[o].uuid===outputUUID && outputIndex<outCircle.arcs[o].ports.length) {
			outputID = Number(outCircle.arcs[o].id);
			outPort = outCircle.arcs[o].ports[outputIndex];
		}
	}

	if(!isNaN(inputID) && !isNaN(outputID)) {

		var msg = {
			'type':'route',
			'data':{
				'uuid' : outputUUID,
				'index' : Number(outputIndex),
				'link' : {
					'id' : Number(inputID),
					'index' : Number(inputIndex),
					'isAlive' : isAlive,
				}
			}
		};

		console.log(msg);

	    var tempName = Number(outputID)+'/'+Number(inputID)+'__'+Number(inputIndex)+'/'+Number(outputIndex);

	    if(statelessConnections[tempName]) delete statelessConnections[tempName]
    	statelessConnections[tempName] = new Cord(context,outPort,inPort,tempName);
    	statelessConnections[tempName].stateless = true;
	}
	else console.log('bad data: '+JSON.stringify(arguments));
}

////////////
////////////
////////////

function updateConnections(data){

	for(var c in allConnections){
		allConnections[c].exists = false;
	}

	for(var outputUUID in data) {

		var outputID = data[outputUUID].id;

		for(var i=0;i<outCircle.arcs.length;i++) {

			// loop through each Arc (node)
			if(outCircle.arcs[i].id===outputID) {

				var outputArray = data[outputUUID].output;

				// loop through all Output ports
				for(var outputIndex=0;outputIndex<outputArray.length;outputIndex++) {

					var portLinks = outputArray[outputIndex].links;

					if(portLinks) {

						// loop through this Output port's Link array
						for(var l=0;l<portLinks.length;l++) {

							var inputID = portLinks[l].id;
							var inputIndex = portLinks[l].index;

							testConnectionExistence(outputID,inputID,inputIndex,outputIndex);
						}
					}
				}

				break; // break the loop through all arcs
			}
		}
	}


	for(var c in allConnections){
		if(!allConnections[c].exists){
			delete allConnections[c];
			if(statelessConnections[c]) delete statelessConnections[c];
		}
	}
}

////////////
////////////
////////////

function testConnectionExistence(outputID,inputID,inputIndex,outputIndex){
	var tempName = Number(outputID)+'/'+Number(inputID)+'__'+Number(inputIndex)+'/'+Number(outputIndex);
	
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