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
			alert('Bluetooth not enabled');
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

	if(BLE_IS_ENABLED && patchBLE.connectionSize===0) {

		if(!patchBLE.isScanning) {

			function onScanSuccess (data) {
				if(data && data.status==='scanStarted') {

					patchBLE.isScanning = true;
					patchBLE.doom('all');

					// tell the front end that we're scanning
					updateScanButton(true);
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

				patchBLE.isScanning = false;
				patchBLE.immortal('all');

				// tell the front end that we're scanning
				updateScanButton(false);
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

	console.log('\t\t'+peripheral.address);

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

						// now add it to our global object of patchbay nodes
						patchBLE.add(peripheral);
						startListening();
					}

					// if it fails, ignore it for now on
					var onFailure = function(){
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

				console.log('found '+periph.patchbay.name+' ('+periph.patchbay.network+'-'+periph.patchbay.id+')');
				console.log('\tUUID: '+periph.patchbay.uuid);

				// setTimeout(function(){
				// 	readAllLinks(thisNode);
				// },2000);

				// tell the interface
				syncInterface();
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
			self.disconnect(uuid,undefined,true); // true means to .close() it
		}

		// erase the node from our Patchbay object
		if(uuid && self.scene[uuid]) {

			delete self.scene[uuid]; // erase it based off UUID

			// tell the interface
			syncInterface();
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

	'disconnect' : function(uuid, onSuccess, shouldClose) {

		var self = patchBLE;

		if(self.connectedPeripherals[uuid]) {

			var disconnectParams = {
				'address' : uuid
			};

			function disconnectSuccess(data){
				console.log(data.status+': '+data.address);
				if(data && data.status==='disconnecting') {
				}
				else if(data && data.status==='disconnected') {
					onDisconnect(uuid, shouldClose);
					if(onSuccess && typeof onSuccess==='function') {
						onSuccess();
					}
				}
			}

			function disconnectError(){
				console.log('error disconnecting: '+uuid);
				onDisconnect(uuid, shouldClose);
			}

			bluetoothle.disconnect(disconnectSuccess, disconnectError, disconnectParams);
		}
		else if(self.scene[uuid]) onDisconnect(uuid, shouldClose);
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

			// save it to our list of connected nodes
			// even if connection doesn't ever really happen
			patchBLE.connectedPeripherals[uuid] = patchBLE.scene[uuid];

			// if we don't connect after a slight delay, erase this node
			var doNotErase = false;
			setTimeout(function(){
				if(!doNotErase) {
					patchBLE.erase(uuid);
				}
			},2000);

			var reconnectParams = {
				'address' : uuid
			};

			function reconnectSuccess(data){
				if(data && data.status==='connecting') {
					console.log('connecting to '+uuid);
				}
				else if(data && data.status==='connected') {
					console.log('connected to '+uuid);

					doNotErase = true; // we connected before the timeout, so don't erase this node

					// erase it's 'death' timeout
					patchBLE.immortal(uuid);

					if(onConnect && typeof onConnect==='function') onConnect();
				}
				else if(data && data.status==='disconnected') {
					// unexpected disconnect
					console.log('disconnected from '+uuid);
					onDisconnect(uuid);
				}
			}

			function reconnectError(data){
				console.log('error reconnecting with '+uuid);
				patchBLE.erase(uuid);
				if(onFailure && typeof onFailure==='function') onFailure();
			}

			// then connect to the peripheral
			bluetoothle.reconnect(reconnectSuccess, reconnectError, reconnectParams);
		}
	},

	////////////
	////////////;
	////////////

	'death_interval' : 1000, // minimum death interval
	'death_random_shake' : 2000, // randomized difference between death intervals

	'doom' : function (uuid) {

		console.log('dooming: '+uuid);

		var self = patchBLE;

		if(!self.connectedPeripherals[uuid]) {

			function createDeath(uuid) {
				var thisUUID = uuid;
				return function(){

					console.log('testing: '+uuid);

					patchBLE.connect(thisUUID,
						function(){
							// success
							console.log('saved: '+uuid);
							patchBLE.doom(thisUUID);
							patchBLE.disconnect(thisUUID);
						},
						function(){
							// error
							console.log('erasing: '+uuid);
							patchBLE.disconnect(thisUUID);
							patchBLE.erase(thisUUID);
						});
				}
			}

			if(uuid && self.scene[uuid]) {

				clearTimeout(self.scene[uuid].deathTimeout);

				var thisDeath = createDeath(uuid);

				var tempDeathInterval = self.death_interval + Math.floor(Math.random()*self.death_random_shake);

				self.scene[uuid].deathTimeout = setTimeout(thisDeath,tempDeathInterval);

			}
			else if (uuid==='all') {
				for(var n in self.scene) {

					clearTimeout(self.scene[n].deathTimeout);

					var thisInterval = createDeath(n);

					var tempDeathInterval = self.death_interval + Math.floor(Math.random()*self.death_random_shake);

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

		console.log('immortal: '+uuid);

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

function onDisconnect(uuid, shouldClose) {

	if(uuid) {
 
		if(patchBLE.connectedPeripherals[uuid]) {
			delete patchBLE.connectedPeripherals[uuid];// erase the node
		}

		// reset the 'length' of how many connected nodes we have
		patchBLE.connectionSize = 0;
	    for (var _uuid in patchBLE.connectedPeripherals) {
	        if (patchBLE.connectedPeripherals.hasOwnProperty(_uuid)) {
	        	patchBLE.connectionSize++;
	        }
	    }

		if(!shouldClose) {
			// reset it's death timeout
			patchBLE.doom(uuid);
		}
		else {
			console.log('closing: '+uuid);

			function closeSucces(data){
				if(data && data.status==='closed') {
					console.log('sucessfully closed '+uuid);

					// erase it from memory
					// so that we don't call .reconnect() inside discovery
					if(alreadyConnected[uuid]){
						delete alreadyConnected[uuid];
					}
				}
			}

			function closeError(){
				console.log('error closing: '+uuid);
			}

			var closeParams = {
				'address' : uuid
			};

			bluetoothle.close(closeSucces,closeError,closeParams);
		}
	}
}

////////////
////////////
////////////

// this needs to be global so external functions can end discovery

function onDiscoveryDisconnect(discover_success, onSuccess, onFailure) {

	isDiscoveringUUID = undefined; // reset flag

	// aler the interface
	updateDiscoveryIcon(false);

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

	console.log('discovering: '+_p.uuid);

	isDiscoveringUUID = _p.uuid;

	var currentlyConnected = false;

	// alert the interface
	updateDiscoveryIcon(true);

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

		console.log('attempting connection: '+isDiscoveringUUID);

		var connectParams = {
			'address' : isDiscoveringUUID
		};

		function connectSucces(data) {
			console.log(data.status+': '+isDiscoveringUUID);
			if(data && data.status==='connecting') {
			}
			else if(data && data.status==='connected') {
				alreadyConnected[isDiscoveringUUID] = true;
				currentlyConnected = true;
				listServices();
			}
			else if(data && data.status==='disconnected') {
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

							// convert the 64 base buffer to a base 8 buffer
							var letterObject = bluetoothle.encodedStringToBytes(data.value);

							// then convert those integers to a string
							var realName = '';
							for(var n in letterObject) {
								realName += String.fromCharCode(letterObject[n]);
							}

							readCount++;
							thisPort.name = realName; // incase it's not a string

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