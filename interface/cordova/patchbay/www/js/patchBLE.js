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

			setInterval(function(){
				if(user_wants_to_scan && patchBLE.isScanning && !isDiscoveringUUID) {
					startListening();
				}
			},5000);
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

	if(BLE_IS_ENABLED) {

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
				else console.log(data);
			}

			function onScannError (data) {
				console.log('error starting scan :(');
			}

			bluetoothle.startScan( onScanSuccess , onScannError);
		}
		else {
			console.log('already scanning, restarting...');
			// we're already scanning so restart it up again
			stopListening();
			clearTimeout(restartListening);
			restartListening = setTimeout(startListening,100);
		}
	}
	else {
		console.log('BLE not enabled')
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

	if(peripheral.name) console.log('\t\t'+peripheral.name);

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
						if(user_wants_to_scan) startListening();
					}

					// if it fails, ignore it for now on
					var onFailure = function(){
						if(user_wants_to_scan) startListening();
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

				// read all the link values of each of it's output services
				setTimeout(function(){

					function linksSuccess(){
						// console.log('read all links: '+periph.uuid);
						// patchBLE.disconnect(periph.uuid);
					}

					function linksFailure(){
						console.log('failed reading all links: '+periph.uuid);
						// self.erase(periph.uuid);
					}

					patchBLE.readlinks(periph.uuid,'all',linksSuccess,linksFailure); // 'all' means it should read all output services
				},200);

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
		self.disconnect(uuid, syncInterface, true); // true means to .close() it

		// erase the node from our Patchbay object
		if(uuid && self.scene[uuid]) {

			delete self.scene[uuid]; // erase it based off UUID

			// tell the interface
			syncInterface();
		}
		else console.log('error erasing '+uuid+': was not it scene');

		// if the user wants to scan, restart scanning to get fresh advertisements
		if(user_wants_to_scan) {
			startListening();
		}
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
				// console.log(data.status+': '+data.address);
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
					console.log('connection timed out, erasing: '+uuid);
					patchBLE.erase(uuid);
				}
			},2000);

			var reconnectParams = {
				'address' : uuid
			};

			function reconnectSuccess(data){
				if(data && data.status==='connecting') {
					// console.log('connecting to '+uuid);
				}
				else if(data && data.status==='connected') {
					// console.log('connected to '+uuid);

					// tell the interface we're connected
					patchBLE.scene[uuid].patchbay.connected = true;
					syncInterface();

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

	'death_interval' : 30000, // minimum death interval
	'death_random_shake' : 30000, // randomized difference between death intervals

	'doom' : function (uuid) {

		// console.log('dooming: '+uuid);

		var self = patchBLE;

		if(!self.connectedPeripherals[uuid]) {

			function createDeath(uuid) {
				var thisUUID = uuid;
				return function(){

					// console.log('testing: '+uuid);

					patchBLE.connect(thisUUID,
						function(){
							// success
							// console.log('saved: '+uuid);
							patchBLE.doom(thisUUID);
							patchBLE.disconnect(thisUUID);
						},
						function(){
							// error
							// console.log('erasing: '+uuid);
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

		// console.log('immortal: '+uuid);

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

	'readlinks' : function(uuid, index, onSuccess, onFailure) {

		if(uuid && patchBLE.scene[uuid]) {

			var shouldRecurse = false;

			if(index==='all') {
				index = 0;
				shouldRecurse = true;
			}

			var thisNode = patchBLE.scene[uuid].patchbay;

			if(!isNaN(index) && index<thisNode.output.length) {

				// the function that is (potentially) recursed upon to read the characteristic
				function readValue(){

					var thisOutput = thisNode.output[index];
					
					function readSuccess(data) {

						if(data && data.status==='read') {

							// convert the 64 base buffer to a base 8 buffer
							var byteArray = bluetoothle.encodedStringToBytes(data.value);

							// overwrite and save the new link values
							thisOutput.links = [];

							// each links_rx characteristic holds 10 bytes (for 5 max links)
							// [ id , index , id , index , etc..... ]
							for(var i=0;i<10;i+=2) {
								var tempLink = {
									'id' : byteArray[i],
									'index' : byteArray[i+1]
								};

								thisOutput.links.push(tempLink);
							}

							if(shouldRecurse) {
								index++;
								if(index<thisNode.output.length) {
									// recurse
									readValue();
								}
								else {
									// we're done
									syncInterface();
									patchBLE.disconnect(uuid);
									if(onSuccess && typeof onSuccess==='function') onSuccess();
								}
							}
							else {
								// we're done
								syncInterface();
								if(onSuccess && typeof onSuccess==='function') onSuccess();
							}
						}
					}

					function readError(error){
						console.log('error reading: '+uuid+' @ index: '+index);
						if(error) console.log(error);
						onDisconnect(uuid);
						if(onFailure && typeof onFailure==='function') onFailure();
					}

					var readParams = {
						'address' : uuid,
						'serviceUuid' : thisOutput.uuid,
						'characteristicUuid' : thisOutput.characteristics.links_rx.uuid
					};

					bluetoothle.read(readSuccess, readError, readParams);
				}

				if(!patchBLE.connectedPeripherals[uuid]) {
					// first, connect to it
					patchBLE.connect(uuid, function(){
						// second, expose it's outputs
						patchBLE.expose(uuid,readValue,onFailure); // third, 'readValue' will read the links
					}, onFailure);
				}
				else {
					// no need to connect and expose
					readValue();
				}
			}
			else {
				console.log('bad index value: '+index);
			}
		}
	},

	////////////
	////////////
	////////////

	'writelink' : function(uuid, index, linkData, onSuccess, onFailure) {

		if(linkData && !isNaN(linkData.id) && !isNaN(linkData.index) && uuid && patchBLE.scene[uuid]) {

			var thisNode = patchBLE.scene[uuid].patchbay;

			if(!isNaN(index) && index<thisNode.output.length) {

				// the function that is (potentially) recursed upon to read the characteristic
				function writeValue(){

					var thisOutput = thisNode.output[index];
					
					function writeSuccess(data) {

						if(data && data.status==='written') {

							// console.log(data.status+': '+uuid);

							// we're done
							syncInterface();

							setTimeout(function(){
								patchBLE.readlinks(uuid,index,function(){
									patchBLE.disconnect(uuid);
								});
							},400);

							if(onSuccess && typeof onSuccess==='function') onSuccess();
						}
					}

					function writeError(error){
						console.log('error writing: '+uuid+' @ index: '+index);
						if(error) console.log(error);
						onDisconnect(uuid);
						if(onFailure && typeof onFailure==='function') onFailure();
					}

					var buffArray = [
						linkData.id,
						linkData.index,
						linkData.isAlive ? 1 : 0
					];

					var writeParams = {
						'address' : uuid,
						'serviceUuid' : thisOutput.uuid,
						'characteristicUuid' : thisOutput.characteristics.links_tx.uuid,
						'value' : bluetoothle.bytesToEncodedString(buffArray)
					};

					bluetoothle.write(writeSuccess, writeError, writeParams);
				}

				if(!patchBLE.connectedPeripherals[uuid]) {
					// first, connect to it
					patchBLE.connect(uuid, function(){
						// second, expose it's outputs
						patchBLE.expose(uuid,writeValue,onFailure); // third, 'writeValue' will write to the links
					}, onFailure);
				}
				else {
					// no need to connect and expose
					writeValue();
				}
			}
			else {
				console.log('bad index value: '+index);
			}
		}
		
	},

	////////////
	////////////
	////////////

	// this function takes a node, and reads all it's OUTPUT services and link characteristics
	// because we can't read/write with any of them until we re-discover :(
	'expose' : function(uuid, onSuccess, onFailure) {

		if(uuid && patchBLE.scene[uuid] && patchBLE.connectedPeripherals[uuid]) {

			var thisNode = patchBLE.scene[uuid].patchbay;

			// get an array of this node's output uuid's
			var servicesArray = [];
			for(var i=0;i<thisNode.output.length;i++) {
				servicesArray.push(thisNode.output[i].uuid);
			}

			if(!servicesArray.length) {
				console.log('node '+uuid+' has no outputs');
				if(onFailure && typeof onFailure==='function') onFailure();
			}
			else {

				var currentOutput = -1;

				function getCharacteristics(){

					currentOutput++;

					if(currentOutput<servicesArray.length) {

						var charParams = {
							'address' : uuid,
							'serviceUuid' : servicesArray[currentOutput],
							'characteristicUuids' : ['1111','1112']	// only look for links_rx and links_tx characteristics
						};

						function charSuccess(data) {
							if(data && data.status==='characteristics') {
								getCharacteristics();				// recursion
							}
						}

						function charError(error) {
							console.log('error reading characteristics');
							if(error) console.log(error);
							if(onFailure && typeof onFailure==='function') onFailure();
						}

						// get the services
						bluetoothle.characteristics(charSuccess, charError, charParams);
					}
					else {
						// we're done
						if(onSuccess && typeof onSuccess==='function') onSuccess();
					}
				}


				function serviceSuccess(data) {
					if(data && data.status==='services' && data.serviceUuids) {
						getCharacteristics();			// init characteristic recursion
					}
				}

				function serviceError(error) {
					console.log('error reading services');
					if(error) console.log(error);
					if(onFailure && typeof onFailure==='function') onFailure();
				}

				var serviceParams = {
					'address' : uuid,
					'services' : servicesArray			// this node's uuid's
				};

				// get the services
				bluetoothle.services(serviceSuccess, serviceError, serviceParams);
			}
		}
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

	if(uuid && patchBLE.scene[uuid]) {

		// tell the interface we're disconnected
		patchBLE.scene[uuid].patchbay.connected = false;
		syncInterface();
 
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
			// only doom if we're currently scanning
			if (patchBLE.isScanning) {
				patchBLE.doom(uuid); // reset it's death timeout
			}
		}
		else {
			// console.log('closing: '+uuid);

			function closeSucces(data){
				if(data && data.status==='closed') {

					// console.log('successfully closed '+uuid);

					// erase it from memory
					// so that we don't call .reconnect() inside discovery
					if(alreadyConnected[uuid]){
						delete alreadyConnected[uuid];
					}

					// restart listening so we can regain it if it's still around
					startListening();
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

	// alert the interface
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

	// console.log('discovering: '+_p.uuid);

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
					},200);
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

		// console.log('attempting connection: '+isDiscoveringUUID);

		var connectParams = {
			'address' : isDiscoveringUUID
		};

		function connectSucces(data) {

			// console.log(data.status+': '+isDiscoveringUUID);

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

		function connectError(error) {
			// retry connection a few times before quitting
			currentlyConnected = false;
			console.log('error connecting:');
			if(error) console.log(error);
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

		function onServicesError(error) {
			if(error) console.log(error);
			finishDiscovery(false);
		}

		function onServicesSucces(data) {
			if(data && data.status==='services' && data.serviceUuids) {
				var thisServiceArray = data.serviceUuids;

				//if a service returned, then that's our service
				if(!thisServiceArray.length) {
					console.log('found no services!');
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

					function onReadError(error) {
						console.log('error reading char '+nameChar.uuid+' from service '+thisPort.uuid);
						if(error) console.log(error);
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