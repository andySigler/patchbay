/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var BLE_IS_ENABLED = false;

function beginBLE(){
	var params = {};
	bluetoothle.initialize(function (data){
		console.log('success initializing BLE');
		if(data.status==='enabled') {
			BLE_IS_ENABLED = true;
		}
		else {
			BLE_IS_ENABLED = false
		}
	},function (data){
		console.log('error initializing BLE');
		BLE_IS_ENABLED = false
	},params);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var restartListening;

function startListening () {

	if(patchBLE.connectionSize===0) {

		if(!patchBLE.isScanning) {

			function onScanSuccess (data) {
				if(data && data.status==='scanStarted') {
					console.log('\n\n\n');
					console.log('\t\tSTARTED');
					console.log('\n\n\n');

					patchBLE.isScanning = true;
					patchBLE.doom('all');

					// alert the parent
					if(patchBLE.onScanStart && typeof patchBLE.onScanStart==='function') {
						patchBLE.onScanStart();
					}
				}
				else if(data && data.status==='scanResult') {
					// we found a new node
					data.uuid = data.address;  // this library calls UUID an 'address'
					onScannedPeripheral(data);
				}
			}

			function onScannError (data) {
				console.log('error starting scan :(');
			}

			bluetoothle.startScan( onScanSuccess , onScannError );
		}
		else {
			// we're already scanning so restart it up again
			stopListening();
			clearTimeout(restartListening);
			restartListening = setTimeout(startListening,1000);
		}
	}
}

////////////
////////////
////////////

function stopListening () {
	if(patchBLE.isScanning) {

		function successStopping (data) {
			if(data && data.status==='scanStopped') {

				console.log('\n\n\n');
				console.log('\t\tSTOPPED');
				console.log('\n\n\n');

				patchBLE.isScanning = false;
				patchBLE.immortal('all');

				// alert the parent
				if(patchBLE.onScanStop && typeof patchBLE.onScanStop==='function') {
					patchBLE.onScanStop();
				}
			}
		}

		function errorStopping (data) {
			patchBLE.isScanning = false;
			console.log('there was an error stopping the Scan');
		}

		bluetoothle.stopScan( successStopping , errorStopping );
	}
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var isDiscoveringUUID = undefined;

function onScannedPeripheral (peripheral) {

	// only check out the new peripheral if we're ready
	// aka, if we're supposed to be scanning, and if we're not currently
	// trying to discover another peripheral

	// also , check to be sure we haven't already
	// stored this peripheral on our ignore list
	if(patchBLE.isScanning && !isDiscoveringUUID && !patchBLE.ignore_peripherals[peripheral.uuid]) { // necessary because the event fires, but still more periphals show up??

		// Patchbay nodes must have a name defined in the Advertisement
		var tempName = peripheral.name;

		if(tempName) {

			// check for the required '~' in the Ad's localName
			var squigleIndex = tempName.indexOf('~');

			if(squigleIndex>=0 && squigleIndex<(tempName.length-1)) {

				if(!patchBLE.scene[peripheral.uuid]) {

					// if we haven't already stored it in memory, discover it...

					isDiscoveringUUID = peripheral.uuid;

					stopListening();

					// this is called if the periphal was identified as a Patchbay node
					var onSuccessDiscovery = function() {

						console.log('discovery success');

						// now add it to our global object of patchbay nodes
						patchBLE.add(peripheral);
						//startListening();
					}

					// if it fails, ignore it for now on
					var onFailure = function(){
						console.log("discovery fail");
						startListening();
					}

					discover(peripheral, onSuccessDiscovery, onFailure);
				}

				// else, we already stored it, so update it's heartbeat
				else {
					patchBLE.doom(peripheral.uuid);
				}
			}
			else {
				// ignore it
				patchBLE.ignore_peripherals[peripheral.uuid] = peripheral;
			}
		}
		else {
			// ignore it
			patchBLE.ignore_peripherals[peripheral.uuid] = peripheral;
		}
	}
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var patchBLE = {

	// all of our discovered nodes
	'scene' : {},

	'isScanning' : false,

	'connectionSize' : 0,

	// all of the peripherals who've failed discovery
	'ignore_peripherals' : {},

	// the currently connected node (if any)
	'connectedPeripherals' : {},

	////////////
	////////////
	////////////

	'startListening' : function () {
		startListening();
	},

	'stopListening' : function () {
		stopListening();
	},

	////////////
	////////////
	////////////

	'add' : function (periph) {
		var self = patchBLE;

		if(periph.uuid) {
			if(!self.scene[periph.uuid]) {

				self.scene[periph.uuid] = periph; // save it based off UUID

				// give it it's first heartbeat
				self.doom(periph.uuid);

				// call the module's 'onDiscovery' event 
				// if the container added the handler
				if(patchBLE.onDiscovery && typeof patchBLE.onDiscovery==='function') {
					patchBLE.onDiscovery(periph.patchbay);
				}
			}
		}
	},

	////////////
	////////////
	////////////

	'erase' : function (uuid) {
		var self = patchBLE;

		// if we're connected to it, disconnect
		if(self.connectedPeripherals[uuid]) {
			self.disconnect(uuid);
		}

		// erase the node from our Patchbay object
		if(uuid && self.scene[uuid]) {

			delete self.scene[uuid]; // erase it based off UUID

			// call the container's 'onErase' event 
			if(patchBLE.onErase && typeof patchBLE.onErase==='function') {
				var _msg = {}
				_msg[uuid] = true;
				patchBLE.onErase(_msg);
			}
		}
		else console.log('error erasing '+uuid+': was not it scene');
	},

	////////////
	////////////
	////////////

	'flush' : function () {
		var self = patchBLE;

		// stop patchBLE and disconnect all 
		stopListening();

		// call .erase() on each no
		// this disconnects and call the parent 'onErase' function for each
    	for(var uuid in self.scene) {
    		patchBLE.erase(uuid);
		}

		// and reset the ignored peripherals so we start with a clean slate
		self.ignore_peripherals = {};
	},

	////////////
	////////////
	////////////

	'disconnect' : function(uuid, onSuccess) {

		var self = patchBLE;

		if(self.connectedPeripherals[uuid]) {

			var disconnectParams = {
				'address' : uuid
			};

			function disconnectSuccess(data){
				if(data && data.status==='disconnecting') {
					//
				}
				else if(data && data.status==='disconnected') {
					onDisconnect(uuid);
					if(onSuccess && typeof onSuccess==='function') {
						onSuccess();
					}
				}
			}

			function disconnectError(){
				console.log('error disconnecting: '+uuid);
				onDisconnect(uuid);
			}

			bluetoothle.disconnect(disconnectSuccess, disconnectError, disconnectParams);
		}
		else if(self.scene[uuid]) onDisconnect(uuid);
		else console.log('error disconnecting '+uuid+': was not currently connected');
	},

	////////////
	////////////
	////////////

	'connect' : function(uuid, onConnect, onFailure) {
		var periph;

		if(uuid) periph = patchBLE.scene[uuid];

		if(!periph) {
			if(onFailure) onFailure();
		}

		else {

			var reconnectParams = {
				'address' : uuid
			};

			function reconnectSuccess(data){
				if(data && data.status==='connecting') {
					//
				}
				else if(data && data.status==='connected') {
					// save it to our list of connected nodes
					patchBLE.connectedPeripherals[uuid] = patchBLE.scene[uuid];

					// erase it's 'death' timeout
					patchBLE.immortal(uuid);

					if(onConnect && typeof onConnect==='function') onConnect();
				}
				else if(data && data.status==='disconnected') {
					// unexpected disconnect
					onDisconnect(uuid);
				}
			}

			function reconnectError(data){
				onDisconnect(uuid);
				if(onFailure && typeof onFailure==='function') onFailure();
			}

			// then connect to the peripheral
			bluetoothle.reconnect(reconnectSuccess, reconnectError, reconnectParams);
		}
	},

	////////////
	////////////;
	////////////

	'death_interval' : 5000,

	'doom' : function (uuid) {

		var self = patchBLE;

		if(!self.connectedPeripherals[uuid]) {

			function createDeath(uuid) {
				var thisUUID = uuid;
				return function(){

					patchBLE.connect(thisUUID,
						function(){
							// success
							patchBLE.doom(thisUUID);
							patchBLE.disconnect(thisUUID);
						},
						function(){
							// error
							patchBLE.disconnect(thisUUID);
							patchBLE.erase(thisUUID);
						});
				}
			}

			if(uuid && self.scene[uuid]) {

				clearTimeout(self.scene[uuid].deathTimeout);

				var thisDeath = createDeath(uuid);

				var tempDeathInterval = self.death_interval + Math.floor(Math.random()*2000);

				self.scene[uuid].deathTimeout = setTimeout(thisDeath,tempDeathInterval);

			}
			else if (uuid==='all') {
				for(var n in self.scene) {

					clearTimeout(self.scene[n].deathTimeout);

					var thisInterval = createDeath(n);

					var tempDeathInterval = self.death_interval + Math.floor(Math.random()*2000);

					self.scene[n].deathTimeout = setTimeout(thisInterval,tempDeathInterval);
				}
			}
			else console.log('error dooming '+uuid);
		}
	},

	////////////
	////////////
	////////////

	'immortal' : function (uuid) {

		var self = patchBLE;

		if(uuid && self.scene[uuid]) {
			clearTimeout(self.scene[uuid].deathTimeout);
		}
		else if(uuid === 'all') {
			for(var n in self.scene) {
				clearTimeout(self.scene[n].deathTimeout);
			}
		}
	},

	////////////
	////////////
	////////////

	'readlink' : function(data, onSuccess, onFailure) {

		// var self = patchBLE;

		// /*

		// 	var data = {
		// 		'uuid' : String,
		// 		'index' : Number
		// 	};

		// */

		// // then connect to the peripheral

		// if(data.uuid && self.connectedPeripherals[data.uuid]) {
			
		// 	var thisNode = self.connectedPeripherals[data.uuid].patchbay;

		// 	// read from the the next OUTPUT
		// 	if(!isNaN(data.index) && thisNode.output[data.index]) {

		// 		var thisOutput = thisNode.output[data.index];

		// 		var thisCharacteristic = thisOutput.characteristics.links_rx;

		// 		console.log('about to read');

		// 		// read from the characteristic
		// 		bluetoothle.read( data.uuid, function (error, data) {

		// 			if(error) console.log(error);

		// 			if(data && Buffer.isBuffer(data)) {

		// 				console.log('got data:');
		// 				console.log(data);

		// 				// reset it's array of current links to an empty array 
		// 				thisOutput.links = [];

		// 				// increment by 2 [ID-index]
		// 				for(var i=0;i<data.length;i+=2) {

		// 					var tempID = data[i];
		// 					var tempIndex = data[i+1];

		// 					if(!isNaN(tempID) && !isNaN(tempIndex)) {

		// 						// ignore values of 255
		// 						if(tempID!==255 && tempIndex!==255) {

		// 							// save the ID and index as a new link for this Output
		// 							thisOutput.links.push({
		// 								'id' : tempID,
		// 								'index' : tempIndex
		// 							});
		// 						}
		// 					}
		// 				}

		// 				if(onSuccess) onSuccess();
		// 			}
		// 			else {
		// 				console.log('bad buffer');
		// 				console.log(data);
		// 				if(onFailure) onFailure();
		// 			}
		// 		});
		// 	}

		// }
		// else {
		// 	console.log("not currently connected to "+data.uuid);
		// 	if(onFailure) onFailure();
		// }
	},

	////////////
	////////////
	////////////

	'writelink' : function(data, onSuccess, onFailure) {

		// var self = patchBLE;

		// /*

		// 	var data = {
		// 		'uuid' : String,
		// 		'index' : Number,
		// 		'link' : {
		// 			'id' : Number,
		// 			'index' : Number,
		// 			'isAlive' : Boolean,
		// 		}
		// 	};

		// */

		// // create a buffer to hold the three bytes

		// if(data && data.uuid && !isNaN(data.index) && data.link && self.scene[data.uuid]) {

		// 	// ID - Index - isAlive
		// 	var buffArray = [];

		// 	buffArray[0] = data.link.id;
		// 	buffArray[1] = data.link.index;
		// 	buffArray[2] = data.link.isAlive ? 1 : 0;

		// 	if(!isNaN(buffArray[0]) && !isNaN(buffArray[1]) && !isNaN(buffArray[2])) {

		// 		var buf = new Buffer(buffArray);

		// 		if(self.connectedPeripherals[data.uuid]) {

		// 			var tempNode = self.connectedPeripherals[data.uuid].patchbay;

		// 			if(tempNode.output[data.index]) {

		// 				var theChar = tempNode.output[data.index].characteristics.links_tx;

		// 				// now write to the Char
		// 				theChar.write(buf, true, function (error) {
		// 					if(error) {
		// 						console.log("error writing");
		// 						console.log(error);
		// 						if(onFailure) onFailure();
		// 					}
		// 					else {
		// 						if(onSuccess) onSuccess();
		// 					}
		// 				});
		// 			}
		// 			else {
		// 				console.log('output index out of bounds: '+data.index);
		// 				if(onFailure) onFailure();
		// 			}
		// 		}
		// 		else {
		// 			console.log('not connected to '+data.uuid);
		// 			if(onFailure) onFailure();
		// 		};
		// 	}
		// 	// failure, bad data
		// 	else {
		// 		console.log("bad data 2");
		// 		console.log(JSON.stringify(data,undefined,2));
		// 		if(onFailure) onFailure();
		// 	}
		// }
		// // failure, bad data
		// else {
		// 	console.log("bad data 1");
		// 	console.log(JSON.stringify(data,undefined,2));
		// 	if(onFailure) onFailure();
		// }
		
	}

	////////////
	////////////
	////////////

};

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

// create a disconnect event for this node
// this is the only disconnect emitter given to a recognized Patchbay node
// so it should be kept simple, and should clean things up

function onDisconnect(uuid) {

	if(uuid) {
 
		if(patchBLE.connectedPeripherals[uuid]) {
			delete patchBLE.connectedPeripherals[uuid];// erase the node
		}

		// reset it's death timeout
		patchBLE.doom(uuid);

		// reset the 'length' of how many connected nodes we have
		patchBLE.connectionSize = 0;
	    for (var _uuid in patchBLE.connectedPeripherals) {
	        if (patchBLE.connectedPeripherals.hasOwnProperty(_uuid)) {
	        	patchBLE.connectionSize++;
	        }
	    }
	}
}

////////////
////////////
////////////

// this needs to be global so external functions can end discovery

function onDiscoveryDisconnect(discover_success, onSuccess, onFailure) {

	isDiscoveringUUID = undefined; // reset flag

	if(patchBLE.onDiscoverStop && typeof patchBLE.onDiscoverStop==='function') {
		patchBLE.onDiscoverStop();
	}

	// if it's ended successfully
	// fire the event on success callback
	if(discover_success && onSuccess) {
		onSuccess();
	}
	else if(onFailure && typeof onFailure==='function') {
		onFailure();
	}
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

/*

	below is a big fat function for reading in a new peripheral
	and testing to see if it's a Patchbay node

	this includes reading each Service on the device
	each Service's characteristics
	and then reading the special 'name' characteristics

*/

var alreadyConnected = {};


function discover (_p, onSuccess, onFailure) {

	console.log('inside discovery');

	isDiscoveringUUID = _p.uuid;

	var currentlyConnected = false;

	// alert the parent
	if(patchBLE.onDiscoverStart && typeof patchBLE.onDiscoverStart==='function') {
		patchBLE.onDiscoverStart();
	}

	////////////
	////////////
	////////////

	// called when we're finished with this peripheral
	// whether if failed or not
	function finishDiscovery(fullyDiscovered){

		if(currentlyConnected) {

			var params = {
				'address' : isDiscoveringUUID
			};

			function disconnectSucces(data) {
				if(data && data.status==='disconnecting') {
					// console.log('trying to disconnect....');
				}
				else if(data && data.status==='disconnected') {

					currentlyConnected = false;

					setTimeout(function(){
						onDiscoveryDisconnect(fullyDiscovered, onSuccess, onFailure);
					},1000);
				}
			}

			function disconnectError(data) {
				console.log('ERROR disconnecting');

				onDiscoveryDisconnect(fullyDiscovered, onSuccess, onFailure);
			}

			// attempt disconnection
			bluetoothle.disconnect(disconnectSucces, disconnectError, params);

		}

		// if we're not connected, just finish it
		else onDiscoveryDisconnect(fullyDiscovered, onSuccess, onFailure);
	}

	////////////
	////////////
	////////////

	var connectCount = 0;

	function connectToIt() {

		console.log('about to try connecting...');

		var connectParams = {
			'address' : isDiscoveringUUID
		};

		function connectSucces(data) {
			if(data && data.status==='connecting') {
				console.log('trying to connect.....');
			}
			else if(data && data.status==='connected') {
				console.log('SUCCESS connecting');
				alreadyConnected[isDiscoveringUUID] = true;
				currentlyConnected = true;
				listServices();
			}
			else if(data && data.status==='disconnected') {
				console.log('unexpected disconnect!!');
				currentlyConnected = false;
				finishDiscovery(false);
			}
		}

		function connectError(data) {
			// retry connection a few times before quitting
			currentlyConnected = false;
			console.log('error connecting:'+error);
			connectCount++;
			if(connectCount<5) {
				setTimeout(connectToIt,10);
			}
			else finishDiscovery(false);
		}

		setTimeout(function(){

			if(alreadyConnected[isDiscoveringUUID]) {
				bluetoothle.reconnect(connectSucces, connectError, connectParams);
			}
			else bluetoothle.connect(connectSucces, connectError, connectParams);
		},50);
	}

	////////////
	////////////
	////////////

	// the bytes that should appear at the beginning of a particular I/O service
	var port_gatt_ref = {
		'output' : {
			'uuid_prefix' : '78',
			'total_chars' : 3,
			'char_refs' : {
				'1110' : 'name',
				'1111' : 'links_rx',
				'1112' : 'links_tx'
			}
		},
		'input' : {
			'uuid_prefix' : '68',
			'total_chars' : 1,
			'char_refs' : {
				'1110' : 'name'
			}
		}
	};

	// the services we're looking for (input and output services only)
	var possibleServices = [
		'6800',
		'6801',
		'6802',
		'6803',
		'6804',
		'6805',
		'6806',
		'6807',
		'6808',
		'6809',
		'7800',
		'7801',
		'7802',
		'7803',
		'7804',
		'7805',
		'7806',
		'7807',
		'7808',
		'7809',
	];

	////////////
	////////////
	////////////

	function listServices() {

		/*

			patchbay.input = [port,port,etc..];
			patchbay.output = [port,port,etc..];


			var port = {
				'name' : String,
				'links' : Array
				'characteristics' : {
					'name' : [Object],
					'links_rx' : [Object],		// output only
					'links_tx' : [Object]		// output only
				}
			}

		*/

		// stores all information
		_p.patchbay.input = [];
		_p.patchbay.output = [];

		function onServicesError(data) {
			finishDiscovery(false);
		}

		function onServicesSucces(data) {
			if(data && data.status==='services' && data.serviceUuids) {
				var thisServiceArray = data.serviceUuids;

				//if a service returned, then that's our service
				if(!thisServiceArray.length) {
					if(error) console.log(error);
					else console.log('found no services!');
					finishDiscovery(false);
				}
				else {

					var currentServiceIndex = -1;

					function serviceIterate() {

						currentServiceIndex++;

						if(currentServiceIndex>=thisServiceArray.length) {
							// we're done!

							if(_p.patchbay.output.length+_p.patchbay.input.length) {
								console.log('success reading services and chars');
								getPortNames();
							}
							else finishDiscovery(false);
						}
						else {
							// read this service's characteristics

							var tempUUID = thisServiceArray[currentServiceIndex];

							var uuidPrefix = tempUUID.slice(0,2);			// get the first 2 bytes to tell it's type
							var portIndex = Number(tempUUID.slice(2,4)); 	// the last 2 bytes tell it's index

							// test to see if this service if an 'input' or 'output'
							var portType = undefined;

							if(uuidPrefix === port_gatt_ref.output.uuid_prefix) {
								portType = 'output';
							}
							else if(uuidPrefix === port_gatt_ref.input.uuid_prefix) {
								portType = 'input';
							}

							if(!portType && isNaN(portIndex)) {
								serviceIterate();				// recurse the char reading
							}
							else {

								var thisCharRefs = port_gatt_ref[portType].char_refs;

								var tempPort = {
									'uuid' : tempUUID,
									'name' : '',
									'links' : [],
									'characteristics' : {}
								};

								var charParams = {
									'address' : isDiscoveringUUID,
									'serviceUuid' : tempUUID,
									'characteristicUuids' : ['1110','1111','1112']
								};

								function onCharSucces(data) {

									if(data && data.status==='characteristics') {

										var tempChars = data.characteristics;

										var foundChars = 0;

										for(var c=0;c<tempChars.length;c++) {
											tempChars[c].uuid = tempChars[c].characteristicUuid;
											var thisCharUUID = tempChars[c].uuid;

											// see if this UUID is used by patchbay
											var char_meaning = thisCharRefs[thisCharUUID];
											if(char_meaning) {

												// save this characteristic
												tempPort.characteristics[char_meaning] = tempChars[c];

												foundChars++;
											}
										}

										// test if we found all needed characteristics for this port
										if(foundChars===port_gatt_ref[portType].total_chars) {
											// save it to the correct port array at it's index
											_p.patchbay[portType][portIndex] = tempPort;
										}

										serviceIterate();				// recurse the char reading
									}
									else {
										console.log('unknown status return from .characteristics()');
										console.log(data);

										finishDiscovery(false);
									}
								}

								function onCharError(){
									finishDiscovery(false);
								}

								bluetoothle.characteristics(onCharSucces, onCharError, charParams);
							}
						}
					}
					serviceIterate(); // initiate the recursive loop
				}
			}
		}

		var servicesParams = {
			'address' : isDiscoveringUUID,
			'serviceUuids' : possibleServices
		}

		bluetoothle.services(onServicesSucces, onServicesError, servicesParams);
	}

	////////////
	////////////
	////////////

	function getPortNames(){

		// go through each I/O service, and read it's NAME characteristic

		// if we don't succeed reading all the names, than say we failed =(

		var currentIndex = -1;
		var triedOutputs = false;

		var readCount = 0;
		var readCountTotal = _p.patchbay.input.length + _p.patchbay.output.length;

		function readNextNameChar(_portsArray) {

			currentIndex++;

			if(currentIndex<_portsArray.length) {
				// pull the real service
				var thisPort = _portsArray[currentIndex];

				// inside that service, find the correct name characteristic
				var nameChar = thisPort.characteristics.name;

				if(nameChar) {

					var readParams = {
						'address' : isDiscoveringUUID,
						'serviceUuid' : thisPort.uuid,
						'characteristicUuid' : nameChar.uuid
					};

					function onReadSuccess(data) {
						if(data && data.status==='read') {
							readCount++;
							thisPort.name = data.value+''; // incase it's not a string
							readNextNameChar(_portsArray);
						}
					}

					function onReadError(data) {
						console.log('error reading char '+nameChar.uuid+' from service '+thisPort.uuid);
						readNextNameChar(_portsArray);
					}

					bluetoothle.read(onReadSuccess, onReadError, readParams);
				}
				else {
					readNextNameChar(_portsArray);
				}
			}
			else {

				// initiate reading the OUTPUTs if we haven't yet
				if(triedOutputs===false) {
					triedOutputs = true;
					currentIndex = -1; // reset the index counter
					readNextNameChar(_p.patchbay.output);
				}
				// already read OUTPUTs, so it's time to return
				else if(readCount===readCountTotal){
					// we're finished
					console.log('SUCCESS MOTHA FUCKA');
					finishDiscovery(true);
				}
				else {
					finishDiscovery(false); // couldn't read all the names
				}
			}
		}

		readNextNameChar(_p.patchbay.input); // initiate the recursion
	}

	////////////
	////////////
	////////////

	// first, try saving it's name, and ID, and Network
	try {
		var tempArray = _p.name.split('~');

		var thisName = tempArray[0];
		var tempHexString = tempArray[1];
		var idHexString = tempHexString.slice(0,2);
		var networkHexString = tempHexString.slice(2);
		var thisID = parseInt('0x'+idHexString);
		var thisNetwork = parseInt('0x'+networkHexString);

		if(!_p.patchbay) _p.patchbay = {};

		_p.patchbay.uuid = _p.uuid;
		_p.patchbay.name = thisName;
		_p.patchbay.id = thisID; 			// mesh-ID for the RFm69
		_p.patchbay.network = thisNetwork;	// sub-network for the RFm69
		
		connectToIt();
	}

	// if this fails, then finish discovery
	catch(e) {
		console.log('error caught!!!');
		console.log(e);
		finishDiscovery(false);
	}

	////////////
	////////////
	////////////

}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////