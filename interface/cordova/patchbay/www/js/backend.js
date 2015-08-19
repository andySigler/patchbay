/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function sendInterfaceMessage(msg) {
	console.log(msg);
}

////////////
////////////
////////////

function syncWebpage() {

	// console.log('\n\n');
	// console.log(foundNodes);
	// console.log('\n\n');

	var msg = {
		'type' : 'sync',
		'data' : {
			'scene' : foundNodes,
			'scan' : isScanning,
			'discovering' : isDiscovering
		}
	};

	sendInterfaceMessage(msg);
}

////////////
////////////
////////////

var userWantsToScan = true;

function interfaceMessageHandler(msg) {

	switch (msg.type) {
		case 'route' :
			route(msg.data);
			break;
		case 'scan' :
			if(msg.data && msg.data.state && msg.data.state===true) {
				userWantsToScan = true;
				patchBLE.startListening();
			}
			else {
				userWantsToScan = false;
				patchBLE.stopListening();
			}
			break;
		case 'readlinks' :
			if(msg.data && msg.data.uuid && foundNodes[msg.data.uuid]) {
				readAllLinks(foundNodes[msg.data.uuid]);
			}
			break;
		case 'flush' : 
			patchBLE.flush();
			break;
	}
});

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var isScanning = false;

patchBLE.onScanStart = function() {

	isScanning = true;

	syncWebpage();
};

patchBLE.onScanStop = function() {

	isScanning = false;
	
	syncWebpage();
};

////////////
////////////
////////////

var isDiscovering = false;

patchBLE.onDiscoverStart = function() {

	isDiscovering = true;

	syncWebpage();
};

patchBLE.onDiscoverStop = function() {

	isDiscovering = false;
	
	syncWebpage();
};

////////////
////////////
////////////

var foundNodes = {};

// fires when a new node arrived on the scene
patchBLE.onDiscovery = function(_node) {

	// save the node (contains ports and their names)

	var thisNode = {
		'name' : _node.name,
		'uuid' : _node.uuid,
		'id' : _node.id,
		'network' : _node.network,
		'input' : _node.input,
		'output' : _node.input
	};

	console.log('total inputs: '+_node.input.length);

	foundNodes[_node.uuid] = thisNode;

	console.log('found '+thisNode.name+' ('+thisNode.network+'-'+thisNode.id+')');
	console.log('\tUUID: '+thisNode.uuid);

	setTimeout(function(){
		//readAllLinks(thisNode);
	},2000);

	syncWebpage();
}

////////////
////////////
////////////

// fires when a node has left the scene
patchBLE.onErase = function(erasedNodes) {

	for(var uuid in erasedNodes) {
		console.log('Erased '+foundNodes[uuid].name);
		delete foundNodes[uuid];
	}

	syncWebpage();
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////


// Make or Break a link

// all links are stored on Output Ports
// and correspond to the opposing Input Port's index and RFM69 id

function route(data) {
	patchBLE.stopListening();

	function conclude(){
		patchBLE.disconnect(data.uuid);
		if(userWantsToScan) patchBLE.startListening();
	}

	var thisFinishFlag = false;

	setTimeout(function(){
		if(!thisFinishFlag) {
			// we timed out :(
			conclude();
		}
		thisFinishFlag = true;
	},2000);

	patchBLE.connect(data.uuid, function () {

		// console.log('sucessful connect, now writing...');

		patchBLE.writelink(data, function () {

			// console.log('sucessful write, now reading...');

			// here it's tricky, because we have to wait for the node
			// to update it's own patchBLE value, which should be ~500ms
			// so we'll give it a maximum of 1000ms to fulfill it's duties

			var thisSuccess = true;
			var readAgain = true;

			var thisInterval = setInterval(function(){
				if(thisFinishFlag) {
					if(!thisSuccess) {
						console.log('DID NOT SUCCEED ON SYNC');
						conclude();
					}
					clearInterval(thisInterval);
				}
				else if(readAgain){
					readAgain = false;
					patchBLE.readlink(data, function() {

						// now we check the node's output Link at that index
						// to check to see if it's changed to what WE said it is

						var foundMatch = false;

						var linkArray = foundNodes[data.uuid].output[data.index].links;
						for(var l=0;l<linkArray.length;l++) {
							if(linkArray[l].id===data.link.id && linkArray[l].index===data.link.index) {
								foundMatch = true;
							}
						}

						if(data.link.isAlive == foundMatch) {
							thisFinishFlag = true;
							thisSuccess = true;

							conclude();

							syncWebpage();
						}
						else {
							readAgain = true;
						}
					});
				}
			}, 100);
		}, function(){
			console.log('failure writing to link');
			conclude();
		});
	}, function(){
		console.log('failure connecting');
		conclude();
	});
}

////////////
////////////
////////////

function readAllLinks(_node) {

	patchBLE.stopListening();

	patchBLE.connect(_node.uuid, function() {

		var onDone = function(){
			syncWebpage();
			patchBLE.disconnect(_node.uuid);
			if(userWantsToScan) patchBLE.startListening();
		};
		
		function readPort(currentIndex){

			if(currentIndex<_node.output.length) {

				var msg = {
					'uuid' : _node.uuid,
					'index' : currentIndex,
				};

				patchBLE.readlink(msg, function(){

					// increment the index, and call this function again
					readPort(currentIndex+1);

				},function(){
					console.log('error reading link from node '+_node.uuid);
					onDone();
				});
			}
			else {
				// we've read everything possible, so sync webpage

				onDone();
			}
		}

		readPort(0); // initiate feedback

	});
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////