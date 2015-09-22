////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

var user_wants_to_scan = false;

function updateScanButton(state) {
	var butt = document.getElementById('scanButton');
	butt.currentState = state ? true : false;

	if(butt.currentState) {
		butt.style.color = 'white'; // text white means we're scanning
	}
	else {
		butt.style.color = 'rgb(39,39,39)'; // text grey means we're scanning
	}
}

function updateDiscoveryIcon(state) {
	if(state) {
		document.getElementById('discovery').style.display = 'inline-block';
	}
	else {
		document.getElementById('discovery').style.display = 'none';
	}
}

function setupUI(){

	var butt = document.getElementById('scanButton');

	updateScanButton(false);

	var hammerTime = Hammer(butt);
	hammerTime.on('touch',function(event){

		// flip the state of what the user wants
		user_wants_to_scan = !user_wants_to_scan;

		if(user_wants_to_scan) {
			//butt.style.backgroundColor = 'rgb(100,255,100)'; // green means user wants to scan
			butt.innerHTML = '<h3>Scan ON</h3>';
			if(!butt.currentState) { // if BLE isn't scanning, then start scanning
				patchBLE.startListening();
			}
		}
		else {
			//butt.style.backgroundColor = 'rgb(176,176,176)'; // grey means user does not want to scan
			butt.innerHTML = '<h3>Scan OFF</h3>';
			if(butt.currentState) { // if BLE is scanning, stop scanning
				patchBLE.stopListening();
			}
		}
	});
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function syncInterface() {

	// passes total port amount for each node, and eventually a name for each port
	updateNodes(patchBLE.scene);
	
	// // passes master list of all connections (between an input and an output)
	updateConnections(patchBLE.scene);
}

//////////////
//////////////
//////////////

function flushScene() {
	patchBLE.flush();
}

//////////////
//////////////
//////////////

var waitSignTimeout = undefined;

function showWaitSign(){
	console.log('\n\nSHOWING THE WAIT SIGN\n\n');

	waitSignTimeout = setTimeout(removeWaitSign,2000);

	document.getElementById('waitSign').style.display = 'block';
}

//////////////
//////////////
//////////////

function removeWaitSign(){
	console.log('\n\nREMOVING THE WAIT SIGN\n\n');

	clearTimeout(waitSignTimeout);

	document.getElementById('waitSign').style.display = 'none';
}

//////////////
//////////////
//////////////

function readLinks(uuid) {
	console.log('reading all links from: '+uuid);

	showWaitSign();

	patchBLE.readlinks(uuid,'all',removeWaitSign,removeWaitSign);
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

		var linkData = {
			'id' : Number(inputID),
			'index' : Number(inputIndex),
			'isAlive' : isAlive,
		};

		showWaitSign();

		patchBLE.writelink(outputUUID, Number(outputIndex), linkData, removeWaitSign, removeWaitSign);

	    var tempName = Number(outputID)+'/'+Number(inputID)+'__'+Number(inputIndex)+'/'+Number(outputIndex);

	    // create the fading green cord for user feedback
	    if(statelessConnections[tempName]) delete statelessConnections[tempName]
    	statelessConnections[tempName] = new Cord(context,outPort,inPort,tempName);
    	statelessConnections[tempName].stateless = true;
	}
	else console.log('bad data: '+JSON.stringify(arguments));
}

////////////
////////////
////////////

function updateConnections(scene){

	for(var c in allConnections){
		allConnections[c].exists = false;
	}

	for(var UUID in scene) {

		var outputID = scene[UUID].patchbay.id;

		// loop through each Arc to find the matching interface node
		for(var i=0;i<outCircle.arcs.length;i++) {

			// this node in the GUI is the same node in the scene
			if(outCircle.arcs[i].id===outputID) {

				// get the outputs from this node in the scene
				var outputArray = scene[UUID].patchbay.output;

				for(var outputIndex=0;outputIndex<outputArray.length;outputIndex++) {

					// get the links we found through BLE
					var portLinks = outputArray[outputIndex].links;

					if(portLinks) {

						// loop through this Output port's Link array
						for(var l=0;l<portLinks.length;l++) {

							var inputID = portLinks[l].id;
							var inputIndex = portLinks[l].index;

							// create a new link, or save an already existing link
							testConnectionExistence(outputID,inputID,inputIndex,outputIndex);
						}
					}
				}

				break; // break the loop through all arcs
			}
		}
	}


	// erase all links that weren't updated in the above loop
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
	
	// try to create it, but only if both nodes exist on the GUI
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

			if(!allConnections[tempName]){
				allConnections[tempName] = new Cord(context,outPort,inPort,tempName);
			}
			allConnections[tempName].exists = true;
		}
	}
}

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////