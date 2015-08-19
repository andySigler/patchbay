/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var http_port = 8080;

var filePath = __dirname + '/www';

var http = require('http');
var fs = require('fs');
var mime = require('mime');

var childProcess = require('child_process');

// create the HTTP server to serve the file
var my_HTTPServer = http.createServer(function (request, response) {
  if(request.url==='/') request.url = '/index.html';

  fs.readFile(filePath + request.url, function (error, my_HTML) {

    if(error) {
      my_HTML = JSON.stringify(error);
    }

    response.setHeader("Content-Type", mime.lookup(request.url));
    response.writeHead(200);
    response.write(my_HTML);
    response.end();
  });
});

my_HTTPServer.listen(http_port);

console.log('HTTP server started:');

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

// this just prints out our IP addresses + this Port

var os = require('os');
var ifaces = os.networkInterfaces();

Object.keys(ifaces).forEach(function (ifname) {
  var alias = 0;

  ifaces[ifname].forEach(function (iface) {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }

    if (alias >= 1) {
      // this single interface has multiple ipv4 addresses
      console.log( + ':' + alias, iface.address);
    } else {
      // this interface has only one ipv4 adress
      console.log('\t'+iface.address+':'+http_port);
    }
  });
});

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

var WebSocketServer = require('ws').Server;
var socketServer = new WebSocketServer({'server' : my_HTTPServer});

var mySockets = [];

////////////
////////////
////////////

function sendWebsocketMessage(msg) {
	for(var i=0;i<mySockets.length;i++) {
		try {
			mySockets[i].send(JSON.stringify(msg));
		}
		catch(error) {
			//console.log(error);
			mySockets[i].close();

			// erase it, then decrease i
			mySockets.splice(i,1);
			i--;
		}
	}
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

	sendWebsocketMessage(msg);
}

////////////
////////////
////////////

var userWantsToScan = true;

socketServer.on('connection', function (socket){

	mySockets.push(socket);

	socket.on('message', function (packet){
		try {
			var msg = JSON.parse(packet);
		}
		catch(e){}

		switch (msg.type) {
			case 'route' :
				route(msg.data);
				break;
			case 'scan' :
				if(msg.data && msg.data.state && msg.data.state===true) {
					userWantsToScan = true;
					BLE.startListening();
				}
				else {
					userWantsToScan = false;
					BLE.stopListening();
				}
				break;
			case 'readlinks' :
				if(msg.data && msg.data.uuid && foundNodes[msg.data.uuid]) {
					readAllLinks(foundNodes[msg.data.uuid]);
				}
				break;
			case 'flush' : 
				BLE.flush();
				break;
		}
	});

	socket.on('close', function () {
		for(var i=0;i<mySockets.length;i++) {
			if(mySockets[i]===socket) {
				mySockets.splice(i,1);
				break;
			}
		}
	});

	mySockets.push(socket);
	syncWebpage();
});

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

// the 'discovery' module is an API of sorts to deal with
// all BLE functionality, and well as discovery scene management
var BLE = require('./discovery.js');

var foundNodes = {};

////////////
////////////
////////////

var isScanning = false;

BLE.onScanStart = function() {

	isScanning = true;

	syncWebpage();
};

BLE.onScanStop = function() {

	isScanning = false;
	
	syncWebpage();
};

////////////
////////////
////////////

var isDiscovering = false;

BLE.onDiscoverStart = function() {

	isDiscovering = true;

	syncWebpage();
};

BLE.onDiscoverStop = function() {

	isDiscovering = false;
	
	syncWebpage();
};

////////////
////////////
////////////

// fires when a new node arrived on the scene
BLE.onDiscovery = function(_node) {

	// save the node (contains ports and their names)

	var thisNode = {
		'name' : _node.name,
		'uuid' : _node.uuid,
		'id' : _node.id,
		'network' : _node.network,
		'input' : [],
		'output' : []
	};

	console.log('total inputs: '+_node.input.length);

	// copy everything about the ports, except the characteristics
	for(var i=0;i<_node.input.length;i++) {
		var thisPort = _node.input[i];
		thisNode.input[i] = {};
		thisNode.input[i].name = thisPort.name;
		thisNode.input[i].links = thisPort.links;
	}
	for(var i=0;i<_node.output.length;i++) {
		var thisPort = _node.output[i];
		thisNode.output[i] = {};
		thisNode.output[i].name = thisPort.name;
		thisNode.output[i].links = thisPort.links;
	}

	foundNodes[_node.uuid] = thisNode;

	console.log('found '+thisNode.name+' ('+thisNode.network+'-'+thisNode.id+')');
	console.log('\tUUID: '+thisNode.uuid);

	setTimeout(function(){
		readAllLinks(thisNode);
	},2000);

	syncWebpage();
}

////////////
////////////
////////////

// fires when a node has left the scene
BLE.onErase = function(erasedNodes) {

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
	BLE.stopListening();

	function conclude(){
		BLE.disconnect(data.uuid);
		if(userWantsToScan) BLE.startListening();
	}

	var thisFinishFlag = false;

	setTimeout(function(){
		if(!thisFinishFlag) {
			// we timed out :(
			conclude();
		}
		thisFinishFlag = true;
	},2000);

	BLE.connect(data.uuid, function () {

		// console.log('sucessful connect, now writing...');

		BLE.writelink(data, function () {

			// console.log('sucessful write, now reading...');

			// here it's tricky, because we have to wait for the node
			// to update it's own BLE value, which should be ~500ms
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
					BLE.readlink(data, function() {

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

	BLE.stopListening();

	BLE.connect(_node.uuid, function() {

		var onDone = function(){
			syncWebpage();
			BLE.disconnect(_node.uuid);
			if(userWantsToScan) BLE.startListening();
		};
		
		function readPort(currentIndex){

			if(currentIndex<_node.output.length) {

				var msg = {
					'uuid' : _node.uuid,
					'index' : currentIndex,
				};

				BLE.readlink(msg, function(){

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

var readline = require('readline');

var rl = readline.createInterface(process.stdin, process.stdout, null);

rl.on('line', function (line) {

	var lineArray = line.split(' ');
	var first = lineArray[0];
	var uuid = lineArray[1];

	// GO (start scanning)
	if(first=='g') {
		BLE.startListening();
	}

	// STOP (stop scanning)
	else if(first=='s') {
		BLE.stopListening();
	}

	// FLUSH (remove knowledge of all nodes)
	else if(first=='f') {
		BLE.flush();
	}

	// READ (read each Output's Link array)
	else if(first=='r' && uuid && foundNodes[uuid]) {
		readAllLinks(foundNodes[uuid]);
	}
});

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
    if (options.cleanup) {
    	BLE.flush();
    }
    if (err && err.stack) console.log(err.stack);
    if (options.exit) process.exit();
}

process.on('exit', exitHandler.bind(null,{cleanup:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

BLE.startListening();

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////