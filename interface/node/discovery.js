/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var thisModule = this;

function print (string) {
	if(!string) string = '';
	process.stdout.write(string);
}

function println (string) {
	if(!string) string = '';
	print(string + '\n');
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var noble = require("noble");

var ble_state = undefined;
var onStateChange = undefined;

noble.on('stateChange', function(state) {
	ble_state = state;
	if(onStateChange && typeof onStateChange==='function') onStateChange();
});

////////////
////////////
////////////

noble.on('scanStart', function(){
	noble.isScanning = true;
	PATCHBAY_NODES.doom('all');
	if(thisModule.onScanStart && typeof thisModule.onScanStart==='function') {
		thisModule.onScanStart();
	}
});

noble.on('scanStop', function(){
	noble.isScanning = false;
	PATCHBAY_NODES.immortal('all');
	if(thisModule.onScanStop && typeof thisModule.onScanStop==='function') {
		thisModule.onScanStop();
	}
});

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var restartListening;

function startListening () {

	if(PATCHBAY_NODES.connectionSize===0) {

		if(ble_state==='poweredOn') {
			if(!noble.isScanning) {
				noble.startScanning([], true);
				onStateChange = undefined;
			}
			else {
				// we're already scanning so restart it up again
				stopListening();
				clearTimeout(restartListening);
				restartListening = setTimeout(startListening,1000);
			}
		}
		else if(ble_state===undefined) {
			onStateChange = startListening;
		}
		else {
			println('BLE State Error: '+ble_state);
		}
	}
}

////////////
////////////
////////////

function stopListening () {
	if(noble.isScanning) {
		noble.stopScanning();
	}
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

noble.on('discover', function(peripheral) {

	// only check out the new peripheral if we're ready
	// aka, if we're supposed to be scanning, and if we're not currently
	// trying to discover another peripheral

	// also , check to be sure we haven't already
	// stored this peripheral on our ignore list
	if(noble.isScanning && !isDiscoveringUUID && !PATCHBAY_NODES.ignore_peripherals[peripheral.uuid]) { // necessary because the event fires, but still more periphals show up??

		// Patchbay nodes must have a name defined in the Advertisement
		var tempName = peripheral.advertisement.localName;

		if(tempName) {

			// check for the required '~' in the Ad's localName
			var squigleIndex = tempName.indexOf('~');

			if(squigleIndex && squigleIndex < (tempName.length-1)) {

				if(!PATCHBAY_NODES.scene[peripheral.uuid]) {

					// if we haven't already stored it in memory, discover it...

					isDiscoveringUUID = peripheral.uuid;

					stopListening();

					// this is called if the periphal was identified as a Patchbay node
					var onSuccessDiscovery = function() {

						// now add it to our global object of patchbay nodes
						PATCHBAY_NODES.add(peripheral);
						startListening();
					}

					// if it fails, ignore it for now on
					var onFailure = function(){
						println("discovery fail");
						startListening();
					}

					discover(peripheral, onSuccessDiscovery, onFailure);
				}

				// else, we already stored it, so update it's heartbeat
				else {
					PATCHBAY_NODES.doom(peripheral.uuid);
				}
			}
			else {
				// ignore it
				PATCHBAY_NODES.ignore_peripherals[peripheral.uuid] = peripheral;
				// print('.');
			}
		}
		else {
			// ignore it
			PATCHBAY_NODES.ignore_peripherals[peripheral.uuid] = peripheral;
			// print('.');
		}
	}
});

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var PATCHBAY_NODES = {

	// all of our discovered nodes
	'scene' : {},

	'connectionSize' : 0,

	// all of the peripherals who've failed discovery
	'ignore_peripherals' : {},

	// the currently connected node (if any)
	'connectedPeripherals' : {},

	////////////
	////////////
	////////////

	'add' : function (periph) {
		var self = PATCHBAY_NODES;

		if(periph.uuid) {
			if(!self.scene[periph.uuid]) {

				self.scene[periph.uuid] = periph; // save it based off UUID

				// give it it's first heartbeat
				self.doom(periph.uuid);

				// call the module's 'onDiscovery' event 
				// if the container added the handler
				if(thisModule.onDiscovery && typeof thisModule.onDiscovery==='function') {
					thisModule.onDiscovery(periph.patchbay);
				}
			}
		}
	},

	////////////
	////////////
	////////////

	'erase' : function (uuid) {
		var self = PATCHBAY_NODES;

		// if we're connected to it, disconnect
		if(self.connectedPeripherals[uuid]) {
			self.connectedPeripherals[uuid].disconnect();
		}

		// erase the node from our Patchbay object
		if(uuid && self.scene[uuid]) {

			delete self.scene[uuid]; // erase it based off UUID

			// call the container's 'onErase' event 
			if(thisModule.onErase && typeof thisModule.onErase==='function') {
				var _msg = {}
				_msg[uuid] = true;
				thisModule.onErase(_msg);
			}
		}
		else println('error erasing '+uuid);
	},

	////////////
	////////////;
	////////////

	'death_interval' : 5000,

	'doom' : function (uuid) {

		var self = PATCHBAY_NODES;

		if(!self.connectedPeripherals[uuid]) {

			function createDeath(uuid) {
				var thisUUID = uuid;
				return function(){

					PATCHBAY_NODES.connect(thisUUID,
						function(){
							// success
							PATCHBAY_NODES.doom(thisUUID);
							PATCHBAY_NODES.disconnect(thisUUID);
						},
						function(){
							// error
							PATCHBAY_NODES.disconnect(thisUUID);
							PATCHBAY_NODES.erase(thisUUID);
						});
				}
			}

			if(uuid && self.scene[uuid]) {

				clearTimeout(self.scene[uuid].deathTimeout);

				var thisDeath = createDeath(uuid);

				var tempDeathInterval = self.death_interval + Math.floor(Math.random()*2000);

				self.scene[uuid].deathTimeout = setTimeout(thisDeath,tempDeathInterval);

				// print('+');
			}
			else if (uuid==='all') {
				for(var n in self.scene) {

					clearTimeout(self.scene[n].deathTimeout);

					var thisInterval = createDeath(n);

					var tempDeathInterval = self.death_interval + Math.floor(Math.random()*2000);

					self.scene[n].deathTimeout = setTimeout(thisInterval,tempDeathInterval);
				}
			}
			else println('error dooming '+uuid);
		}
	},

	////////////
	////////////
	////////////

	'immortal' : function (uuid) {

		var self = PATCHBAY_NODES;

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

	'flush' : function () {
		var self = PATCHBAY_NODES;

		// println('clearing BLE');

		// stop BLE and disconnect all 
		stopListening();

		self.disconnect('all');

    	if(isDiscoveringUUID) {
    		noble.disconnect(isDiscoveringUUID);
    	}


    	// call the container's 'onErase' event 
    	var onEraseMsg = {};
    	for(var uuid in self.scene) {
    		onEraseMsg[uuid] = true;
		}

		if(thisModule.onErase && typeof thisModule.onErase==='function') {
			thisModule.onErase(onEraseMsg);
		}


		// then clear the objects
		self.scene = {};
		self.ignore_peripherals = {};
	},

	////////////
	////////////
	////////////

	'readlink' : function(data, onSuccess, onFailure) {

		var self = PATCHBAY_NODES;

		/*

			var data = {
				'uuid' : String,
				'index' : Number
			};

		*/

		// then connect to the peripheral

		if(data.uuid && self.connectedPeripherals[data.uuid]) {
			
			var thisNode = self.connectedPeripherals[data.uuid].patchbay;

			// read from the the next OUTPUT
			if(!isNaN(data.index) && thisNode.output[data.index]) {

				var thisOutput = thisNode.output[data.index];

				var thisCharacteristic = thisOutput.characteristics.links_rx;

				console.log('about to read');

				// read from the characteristic
				thisCharacteristic.read( function (error, data) {

					if(error) println(error);

					if(data && Buffer.isBuffer(data)) {

						console.log('got data:');
						console.log(data);

						// reset it's array of current links to an empty array 
						thisOutput.links = [];

						// increment by 2 [ID-index]
						for(var i=0;i<data.length;i+=2) {

							var tempID = data[i];
							var tempIndex = data[i+1];

							if(!isNaN(tempID) && !isNaN(tempIndex)) {

								// ignore values of 255
								if(tempID!==255 && tempIndex!==255) {

									// save the ID and index as a new link for this Output
									thisOutput.links.push({
										'id' : tempID,
										'index' : tempIndex
									});
								}
							}
						}

						if(onSuccess) onSuccess();
					}
					else {
						println('bad buffer');
						console.log(data);
						if(onFailure) onFailure();
					}
				});
			}

		}
		else {
			println("not currently connected to "+data.uuid);
			if(onFailure) onFailure();
		}
	},

	////////////
	////////////
	////////////

	'writelink' : function(data, onSuccess, onFailure) {

		var self = PATCHBAY_NODES;

		/*

			var data = {
				'uuid' : String,
				'index' : Number,
				'link' : {
					'id' : Number,
					'index' : Number,
					'isAlive' : Boolean,
				}
			};

		*/

		// create a buffer to hold the three bytes

		if(data && data.uuid && !isNaN(data.index) && data.link && self.scene[data.uuid]) {

			// ID - Index - isAlive
			var buffArray = [];

			buffArray[0] = data.link.id;
			buffArray[1] = data.link.index;
			buffArray[2] = data.link.isAlive ? 1 : 0;

			if(!isNaN(buffArray[0]) && !isNaN(buffArray[1]) && !isNaN(buffArray[2])) {

				var buf = new Buffer(buffArray);

				if(self.connectedPeripherals[data.uuid]) {

					var tempNode = self.connectedPeripherals[data.uuid].patchbay;

					if(tempNode.output[data.index]) {

						var theChar = tempNode.output[data.index].characteristics.links_tx;

						// now write to the Char
						theChar.write(buf, true, function (error) {
							if(error) {
								println("error writing");
								println(error);
								if(onFailure) onFailure();
							}
							else {
								if(onSuccess) onSuccess();
							}
						});
					}
					else {
						println('output index out of bounds: '+data.index);
						if(onFailure) onFailure();
					}
				}
				else {
					println('not connected to '+data.uuid);
					if(onFailure) onFailure();
				};
			}
			// failure, bad data
			else {
				println("bad data 2");
				println(JSON.stringify(data,undefined,2));
				if(onFailure) onFailure();
			}
		}
		// failure, bad data
		else {
			println("bad data 1");
			println(JSON.stringify(data,undefined,2));
			if(onFailure) onFailure();
		}
		
	},

	////////////
	////////////
	////////////

	'disconnect' : function(uuid, onSuccess) {

		var self = PATCHBAY_NODES;

		if(uuid=='all') {

			for(var n in self.connectedPeripherals) {

				// if we're connected to something, disconnect from it
				if(self.connectedPeripherals[n] && self.connectedPeripherals[n].state==='connected') {
					self.connectedPeripherals[n].disconnect();
				}
			}
		}
		else if(self.connectedPeripherals[uuid]) {
			self.connectedPeripherals[uuid].disconnect();
		}
		else console.log('error disconnecting '+uuid);
	},

	////////////
	////////////
	////////////

	'connect' : function(uuid, onConnect, onFailure) {
		var self = PATCHBAY_NODES;
		var periph;

		if(uuid) periph = self.scene[uuid];

		if(!periph) {
			if(onFailure) onFailure();
		}

		// else if(self.connectedPeripherals[uuid]) {
		// 	// we're already connected, so just call the success callback
		// 	if(onConnect) onConnect();
		// }

		else {

			// cancel whatever discovery might be currently happening

			if(isDiscoveringUUID && noble._peripherals[isDiscoveringUUID] && noble._peripherals[isDiscoveringUUID].state === 'connected') {
				noble.disconnect(isDiscoveringUUID);
			}



			// create a disconnect event for this node
			// this is the only disconnect emitter given to a recognized Patchbay node
			// so it should be kept simple, and should clean things up

			function onDisconnect() {

				//console.log('\tdisconnect');

				// remove it so it doesn't happen again
				periph.removeListener('disconnect',onDisconnect);

				if(self.connectedPeripherals[periph.uuid]) {
					delete self.connectedPeripherals[periph.uuid];// erase the node
				}
				else {
					// disconnect is being before connect was called!!
					if(onFailure) onFailure();
				}

				// reset it's death timeout
				self.doom(periph.uuid);

				// reset the 'length' of how many connected nodes we have
				self.connectionSize = 0;
			    for (var uuid in self.connectedPeripherals) {
			        if (self.connectedPeripherals.hasOwnProperty(uuid)) {
			        	self.connectionSize++;
			        }
			    }
			}

			periph.removeListener('disconnect',onDisconnect);
			periph.on('disconnect',onDisconnect); // assign the disconnect emitter


			// then connect to the peripheral

			var didConnect = false;

			setTimeout(function(){
				if(!didConnect) {
					console.log('failed any connection');
					onDisconnect();
				}
			},2000);

			periph.connect(function (error) {

				//console.log('\tconnected');

				didConnect = true;
				if(error) {
					println(error);
				}

				periph.discoverAllServicesAndCharacteristics(function(e,s,c){
					// check to be sure it is still in the scene
					if(self.scene[uuid]) {

						// save it to our list of connected nodes
						self.connectedPeripherals[uuid] = self.scene[uuid];

						// erase it's 'death' timeout
						self.immortal(uuid);

						onConnect();
					}
					else {
						// it must have timed out and been deleted from scene
						periph.disconnect();
					}
				});
			});
		}
	}

	////////////
	////////////
	////////////

};

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


// global flag for if we're inside this function or not
var isDiscoveringUUID = undefined;
var afterDiscoveryEvents = [];

function discover (_p, onSuccess, onFailure) {

	if(thisModule.onDiscoverStart && typeof thisModule.onDiscoverStart==='function') {
		thisModule.onDiscoverStart();
	}

	function onDisconnect() {
		isDiscoveringUUID = undefined; // reset flag

		_p.removeListener('disconnect',onDisconnect);

		if(thisModule.onDiscoverStop && typeof thisModule.onDiscoverStop==='function') {
			thisModule.onDiscoverStop();
		}

		// if it's ended successfully
		// fire the event on success callback
		if(discover_success && onSuccess) onSuccess();
		else if(onFailure) onFailure();
	}

	// always give new 'disconnect' event to it
	_p.on('disconnect',onDisconnect);

	////////////
	////////////
	////////////

	isDiscoveringUUID = _p.uuid;

	var discover_success = false;

	////////////
	////////////
	////////////

	// called when we're finished with this peripheral
	// whether if failed or not
	function finishDiscovery(fullyDiscovered){

		discover_success = fullyDiscovered;

		// attempt disconnection
		_p.disconnect(function(error){
			if(error) println(error);
		});
	}

	////////////
	////////////
	////////////

	var connectCount = 0;

	function connectToIt() {

		_p.connect( function (error) {

			if(error) {

				// retry connection a few times before quitting
				println('error connecting:'+error);
				connectCount++;
				if(connectCount<5) {
					setTimeout(connectToIt,10);
				}
				else finishDiscovery(false);
			}

			else {
				listServices();
			}
		});
	};

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

		_p.discoverAllServicesAndCharacteristics(function (error, services, chars) {

			//if a service returned, then that's our service
			if(error || !services.length) {
				if(error) println(error);
				else println('found no services!');
				finishDiscovery(false);
			}
			else {

				// loop through all services inside this peripheral
				for(var s=0;s<services.length;s++) {

					// get the UUID of this internal service
					var tempUUID = services[s].uuid;

					// get the first 2 bytes to tell it's type
					var uuidPrefix = tempUUID.slice(0,2);

					// the last 2 bytes tell it's index
					var portIndex = Number(tempUUID.slice(2,4));

					// test to see if this service if an 'input' or 'output'
					var portType = undefined;

					if(uuidPrefix === port_gatt_ref.output.uuid_prefix) {
						portType = 'output';
					}
					else if(uuidPrefix === port_gatt_ref.input.uuid_prefix) {
						portType = 'input';
					}

					var tempChars = services[s].characteristics;

					if(portType && !isNaN(portIndex) && tempChars && tempChars.length) {

						var thisCharRefs = port_gatt_ref[portType].char_refs;

						var tempPort = {
							'name' : '',
							'links' : [],
							'characteristics' : {}
						};
						var foundChars = 0;

						for(var c=0;c<tempChars.length;c++) {
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
					}
				}
			}

			if(_p.patchbay.output.length+_p.patchbay.input.length) {
				getPortNames();
			}
			else finishDiscovery(false);
		});
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
					nameChar.read( function (error, data){
						if(error) {
							println(error);
							readNextNameChar(_portsArray);
						}
						else {
							readCount++;
							thisPort.name = data+''; // incase it's not a string
							readNextNameChar(_portsArray);
						}
					});
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

		readNextNameChar(_p.patchbay.input);
	}

	////////////
	////////////
	////////////

	// first, try saving it's name, and ID, and Network
	try {
		var tempArray = _p.advertisement.localName.split('~');

		var thisName = tempArray[0];
		var tempHexString = tempArray[1];
		var idHexString = tempHexString.slice(0,2);
		var networkHexString = tempHexString.slice(2);
		var thisID = parseInt('0x'+idHexString);
		var thisNetwork = parseInt('0x'+networkHexString);

		if(!_p.patchbay) _p.patchbay = {};

		_p.patchbay.uuid = _p.uuid;
		_p.patchbay.name = thisName;
		_p.patchbay.id = thisID;
		_p.patchbay.network = thisNetwork;
		// then connect and initiate discovery
		connectToIt();
	}

	// if this fails, then finish discovery
	catch(e) {
		finishDiscovery(false);
	}

	////////////
	////////////
	////////////

}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

module.exports.connect = PATCHBAY_NODES.connect;
module.exports.disconnect = PATCHBAY_NODES.disconnect;

module.exports.startListening = startListening;
module.exports.stopListening = stopListening;

module.exports.isDiscoveringUUID = isDiscoveringUUID;

module.exports.readlink = PATCHBAY_NODES.readlink;
module.exports.writelink = PATCHBAY_NODES.writelink;
module.exports.flush = PATCHBAY_NODES.flush;

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////