/////////////////////////////////////
/////////////////////////////////////
/////////////////////////////////////

var express = require('express');
var app = express();
var HTTP_port = process.env.PORT || 8000;

app.get('*', function(req, res){
	res.sendfile(__dirname + req.url);
});

var http = require('http');
var server = http.createServer(app);
server.listen(HTTP_port);
console.log('http server started on port '+HTTP_port);

/////////////////////////////////////
/////////////////////////////////////
/////////////////////////////////////

//  .S     S.     sSSs   .S_SSSs      sSSs    sSSs_sSSs      sSSs   .S    S.     sSSs  sdSS_SSSSSSbs    sSSs  
// .SS     SS.   d%%SP  .SS~SSSSS    d%%SP   d%%SP~YS%%b    d%%SP  .SS    SS.   d%%SP  YSSS~S%SSSSSP   d%%SP  
// S%S     S%S  d%S'    S%S   SSSS  d%S'    d%S'     `S%b  d%S'    S%S    S&S  d%S'         S%S       d%S'    
// S%S     S%S  S%S     S%S    S%S  S%|     S%S       S%S  S%S     S%S    d*S  S%S          S%S       S%|     
// S%S     S%S  S&S     S%S SSSS%P  S&S     S&S       S&S  S&S     S&S   .S*S  S&S          S&S       S&S     
// S&S     S&S  S&S_Ss  S&S  SSSY   Y&Ss    S&S       S&S  S&S     S&S_sdSSS   S&S_Ss       S&S       Y&Ss    
// S&S     S&S  S&S~SP  S&S    S&S  `S&&S   S&S       S&S  S&S     S&S~YSSY%b  S&S~SP       S&S       `S&&S   
// S&S     S&S  S&S     S&S    S&S    `S*S  S&S       S&S  S&S     S&S    `S%  S&S          S&S         `S*S  
// S*S     S*S  S*b     S*S    S&S     l*S  S*b       d*S  S*b     S*S     S%  S*b          S*S          l*S  
// S*S  .  S*S  S*S.    S*S    S*S    .S*P  S*S.     .S*S  S*S.    S*S     S&  S*S.         S*S         .S*P  
// S*S_sSs_S*S   SSSbs  S*S SSSSP   sSS*S    SSSbs_sdSSS    SSSbs  S*S     S&   SSSbs       S*S       sSS*S   
// SSS~SSS~S*S    YSSP  S*S  SSY    YSS'      YSSP~YSSY      YSSP  S*S     SS    YSSP       S*S       YSS'    
//                      SP                                         SP                       SP                
//                      Y                                          Y                        Y                 
                                                                                                           

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({'server':server});

var allSockets = [];

wss.on('connection', function(ws) {

	ws.router = {
		'inPorts':{}, // 
		'outPorts':{}
	};

	allSockets.push(ws);

    ws.on('message', function(msg) {
    	var message = JSON.parse(msg);
        if(ws_handlers[message.type]) ws_handlers[message.type](ws,message);
        else console.log('got message with type '+message.type);
    });

    ws.on('close',function(){
    	for(var i=0;i<allSockets.length;i++){
    		if(allSockets[i]===ws){
    			allSockets.splice(i,1);
    			break;
    		}
    	}
    });

    cloneToBrowser(ws);
});

function sendSocketMsg(socket,type,msg){
	try{
		socket.send(JSON.stringify({
			'type':type,
			'packet':msg
		}));
	}
	catch(error){
		console.log('ERROR SENDING WS MESSAGE:');
		console.log(error);
	}
}

/////////////////////////////////////
/////////////////////////////////////
/////////////////////////////////////

var ws_handlers = {
	'route': function (socket,msg){
		var receiveID = msg.data.receiveID;
		var senderID = msg.data.senderID;
		var inputIndex = msg.data.inputIndex;
		var outputIndex = msg.data.outputIndex;
		console.log(msg);
		if(receiveID>=0 && senderID>=0){
			sendRoutingMessage(receiveID,senderID,inputIndex,outputIndex,5);
		}
		else if(inputIndex!=99){

			if(receiveID<0){ // the browser must listen, so we store the variable on the pinger Arduino
				if(!socket.router.inPorts[inputIndex]){
					socket.router.inPorts[inputIndex] = {};
				}
				// first, delete the old routing option (to stay consistent with my single-casting jeenodes)
				for(var n in socket.router.inPorts){
					if(socket.router.inPorts[n][senderID] === outputIndex){
						delete socket.router.inPorts[n][senderID];
						break;
					}
				}

				// then save it
				socket.router.inPorts[inputIndex][senderID] = outputIndex;
				if(senderID>=0) saveTesterOnArduino(senderID,true);
			}

			if(senderID<0){ // the browser sends, so we store this on server to be sent out manually onValueChange
				if(!socket.router.outPorts[outputIndex]){
					socket.router.outPorts[outputIndex] = {};
				}
				socket.router.outPorts[outputIndex][receiveID] = inputIndex;
			}
		}
		else{
			if(receiveID<0){ // the browser was listening, so we delete the variable from the pinger Arduino
				for(var n in socket.router.inPorts){
					if(socket.router.inPorts[n][senderID] === outputIndex){
						delete socket.router.inPorts[n][senderID];
						break;
					}
				}
				saveTesterOnArduino(senderID,false);
			}
			if(senderID<0){ // the browser was sending, so we delete this from the socket
				delete socket.router.outPorts[outputIndex][receiveID];
			}
		}
	}
};

function saveTesterOnArduino(index,value){
	console.log('node '+index+ ' is '+value);
}

/////////////////////////////////////
/////////////////////////////////////
/////////////////////////////////////

function cloneToBrowser(socket){
	var msg = {
		'nodes':{},
		'connections':{}
	}
	for(var i in allNodes){
		if(allNodes[i].connected){
			msg.nodes[i] = {
				'name':allNodes[i].name,
				'id':allNodes[i].id,
				'totalPorts':allNodes[i].totalPorts,
				'ports':allNodes[i].ports
			};
			msg.connections[i] = allConnections[i];
		}
	}

	if(!socket){
		for(var i=0;i<allSockets.length;i++){
			sendSocketMsg(allSockets[i],'clone',msg);
		}
	}
	else{
		sendSocketMsg(socket,'clone',msg);
	}
}

setInterval(function(){
	if(true){
		cloneToBrowser();
		didShitChange = false;
	}
},1000);

/////////////////////////////////////
/////////////////////////////////////
/////////////////////////////////////

//   sSSs    sSSs   .S_sSSs     .S   .S_SSSs    S.      
//  d%%SP   d%%SP  .SS~YS%%b   .SS  .SS~SSSSS   SS.     
// d%S'    d%S'    S%S   `S%b  S%S  S%S   SSSS  S%S     
// S%|     S%S     S%S    S%S  S%S  S%S    S%S  S%S     
// S&S     S&S     S%S    d*S  S&S  S%S SSSS%S  S&S     
// Y&Ss    S&S_Ss  S&S   .S*S  S&S  S&S  SSS%S  S&S     
// `S&&S   S&S~SP  S&S_sdSSS   S&S  S&S    S&S  S&S     
//   `S*S  S&S     S&S~YSY%b   S&S  S&S    S&S  S&S     
//    l*S  S*b     S*S   `S%b  S*S  S*S    S&S  S*b     
//   .S*P  S*S.    S*S    S%S  S*S  S*S    S*S  S*S.    
// sSS*S    SSSbs  S*S    S&S  S*S  S*S    S*S   SSSbs  
// YSS'      YSSP  S*S    SSS  S*S  SSS    S*S    YSSP  
//                 SP          SP          SP           
//                 Y           Y           Y            

var serialport = require("serialport");
var SerialPort  = serialport.SerialPort;

var portnames = [];
var serialPorts = [];

serialport.list(function (error, ports) {
	if(!error){
		ports.forEach(function(port) {
			if(port.manufacturer.indexOf('FTDI')>-1 || port.manufacturer.indexOf('Arduino')>-1){
				var tempPort = new SerialPort(port.comName, { 
					baudRate: 57600,
					open: false,
					buffersize:255*8,
					parser: serialport.parsers.readline("\r\n")
				});
				createSerialHandlers(tempPort);
				serialPorts.push(tempPort);
			}
		});
	}
});

/////////////////////////////////////
/////////////////////////////////////
/////////////////////////////////////

function createSerialHandlers(port){
 
	port.on('open', function() {
		console.log('port open: '+port.path);
		port.options.open = true;
	});

	port.on('close', function() {
		console.log('port '+port.path+' closed');
		port.options.open = false;
	});

	port.on('error', function(error) {
		console.log('error on port '+port.path);
		port.close();
		port.options.open = false;
	});

	port.on('data', function(data){
		if(data.indexOf('@ 915 MHz')<0){
			var msg = data.split(',');
			if(msg[0]==='meta'){
				// meta ,ID, NAME, totalIN, totalOUT, portName, portIndex, portType
				var tempData = {
					'id':msg[1],
					'name':msg[2],
					'totalOutputs':msg[3],
					'totalInputs':msg[4],
					'port':{
						'name':msg[5],
						'index':msg[6],
						'type':msg[7] // either 'in' or 'out'

					},
					'router':{
						'id': msg[8],
						'values': []
					}
				}
				console.log("meta: "+tempData.id + ' , port: '+tempData.port.name+' , routerID: '+tempData.router.id);
				for(var i=9;i<msg.length;i++){
					tempData.router.values[i-9] = msg[i];
				}
				if(tempData.id==12 && tempData.router.id==5){
					//console.log(tempData.router.values);
				}
				handleMetaMessage(tempData);
			}
			else if(msg[0]==='poke'){
				console.log('poke: '+msg[1]);
				if(allNodes[msg[1]] && allNodes[msg[1]].connected){
					allNodes[msg[1]].resetSuicide();
				}
				else{
					// initiate meta stuff with nodes that are already on
					console.log('init meta message to node: '+msg[1]);
					initMetaMessages(msg[1]); // these values will be ignored by the arduinos
				}
			}
			else if(msg[0]==='test'){
				console.log(msg);
			}
		}
	});
}

var currentPort = 0;

function serialSend(msg) {
	if (serialPorts[currentPort] && serialPorts[currentPort].options && serialPorts[currentPort].options.open) {
		serialPorts[currentPort].write(msg);
	}
	else{
		console.log('error sending to port '+serialPorts[currentPort]);
	}
	currentPort = (currentPort+1)%serialPorts.length;
}

/////////////////////////////////////
/////////////////////////////////////
/////////////////////////////////////

var routeRequests = [];

function sendRoutingMessage(receiveID,senderID,inputIndex,outputIndex,thresh){

	if(receiveID>0 && receiveID<32){

		var theString = String.fromCharCode(receiveID);
		theString += String.fromCharCode(senderID);
		theString += String.fromCharCode(inputIndex);
		theString += String.fromCharCode(outputIndex);

		var len = String.fromCharCode(theString.length);

		theString = 'r'+len+theString+'^';

		routeRequests.push({
			'string':theString,
			'count':0,
			'thresh': thresh || 5
		});
	}
	else{
		// then it's the tester
		//
	}
}

function initMetaMessages(receiveID){

	if(receiveID>0 && receiveID<32){

		var theString = String.fromCharCode(receiveID);
		var len = String.fromCharCode(theString.length);

		theString = 'i'+len+theString+'^';

		routeRequests.push({
			'string':theString,
			'count':0,
			'thresh': 5
		});
	}
}

setInterval(function(){
	if(routeRequests.length>0){
		serialSend(routeRequests[0].string);
		routeRequests[0].count++;
		if(routeRequests[0].count>=routeRequests[0].thresh){
			routeRequests.splice(0,1);
		}
	}
},50);

/////////////////////////////////////
/////////////////////////////////////
/////////////////////////////////////

//  .S_sSSs      sSSs_sSSs     .S_sSSs      sSSs          sSSs  S.       .S_SSSs      sSSs    sSSs  
// .SS~YS%%b    d%%SP~YS%%b   .SS~YS%%b    d%%SP         d%%SP  SS.     .SS~SSSSS    d%%SP   d%%SP  
// S%S   `S%b  d%S'     `S%b  S%S   `S%b  d%S'          d%S'    S%S     S%S   SSSS  d%S'    d%S'    
// S%S    S%S  S%S       S%S  S%S    S%S  S%S           S%S     S%S     S%S    S%S  S%|     S%|     
// S%S    S&S  S&S       S&S  S%S    S&S  S&S           S&S     S&S     S%S SSSS%S  S&S     S&S     
// S&S    S&S  S&S       S&S  S&S    S&S  S&S_Ss        S&S     S&S     S&S  SSS%S  Y&Ss    Y&Ss    
// S&S    S&S  S&S       S&S  S&S    S&S  S&S~SP        S&S     S&S     S&S    S&S  `S&&S   `S&&S   
// S&S    S&S  S&S       S&S  S&S    S&S  S&S           S&S     S&S     S&S    S&S    `S*S    `S*S  
// S*S    S*S  S*b       d*S  S*S    d*S  S*b           S*b     S*b     S*S    S&S     l*S     l*S  
// S*S    S*S  S*S.     .S*S  S*S   .S*S  S*S.          S*S.    S*S.    S*S    S*S    .S*P    .S*P  
// S*S    S*S   SSSbs_sdSSS   S*S_sdSSS    SSSbs         SSSbs   SSSbs  S*S    S*S  sSS*S   sSS*S   
// S*S    SSS    YSSP~YSSY    SSS~YSSY      YSSP          YSSP    YSSP  SSS    S*S  YSS'    YSS'    
// SP                                                                          SP                   
// Y                                                                           Y                    

var allNodes = {};

function Node(){
	this.name;
	this.id;
	this.connected = false;
	this.totalPorts = {
		'in':undefined,
		'out':undefined
	};
	this.ports = {
		'in':[],
		'out':[]
	};
	this.suicide = undefined;
}

Node.prototype.receivePort = function(data){
	if(!this.ports[data.type][data.index]){
		// create a new port
		var tempPort = new Port();
		tempPort.name = data.name;
		tempPort.index = data.index;
		tempPort.type = data.type;
		tempPort.parentID = this.id;
		this.ports[data.type][data.index] = tempPort;
	}
}

Node.prototype.resetSuicide = function(){
	if(this.suicide) clearTimeout(this.suicide);
	var myID = this.id;
	this.suicide = setTimeout(function(){
		disconnectNode(myID);
	},20000);
}

/////////////////////////////////////
/////////////////////////////////////
/////////////////////////////////////

function Port(){
	this.name;
	this.index;
	this.type; // 'in' or 'out'

	this.parentID;
}

/////////////////////////////////////
/////////////////////////////////////
/////////////////////////////////////

function handleMetaMessage(data){
	if(!allNodes[data.id]){
		// create a new node
		var tempNode = new Node();
		allNodes[data.id] = tempNode;
		initMetaMessages(data.id);
	}
	if(!allNodes[data.id].connected){
		allNodes[data.id].connected = true;
		allNodes[data.id].id = data.id;
		allNodes[data.id].name = data.name;
		allNodes[data.id].totalPorts.in = data.totalInputs;
		allNodes[data.id].totalPorts.out = data.totalOutputs;
	}
	allNodes[data.id].resetSuicide();
	allNodes[data.id].receivePort(data.port);
	receiveConnections(data.id,data.router);
}

function disconnectNode(myID){
	if(allNodes[myID]){
		console.log('disconnecting node '+myID);
		allNodes[myID].connected = false;
		// then delete all connections dealing with that node

		for(var n in allConnections){
			if(n===myID){
				delete allConnections[n];
			}
			else if(allConnections[n][myID]){
				for(var i=0;i<allConnections[n][myID].length;i++){
					allConnections[n][myID] = '99';
				}
			}
		}
	}
}

/////////////////////////////////////
/////////////////////////////////////
/////////////////////////////////////

var allConnections = {};

function receiveConnections(nodeID,data){
	if(!allConnections[nodeID]){
		allConnections[nodeID] = {};
	}
	allConnections[nodeID][data.id] = data.values;
}

/////////////////////////////////////
/////////////////////////////////////
/////////////////////////////////////