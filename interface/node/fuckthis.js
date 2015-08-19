var noble = require("noble");

noble.on('stateChange', function(state) {
	if(state==='poweredOn') {
		noble.startScanning();
	}
	else{
		console.log(state);
	}
});

var myUUID = 'e732749b0fd1451e957f26e9aa9ddd6e';

var myPeripheral = undefined;
var myChar = undefined;

noble.on('discover',function(peripheral){

	console.log(peripheral.uuid);
	console.log('\t'+peripheral.advertisement.localName);

	if(peripheral.uuid === myUUID) {

		myPeripheral = peripheral;

		noble.stopScanning();

		myPeripheral.connect(function(error){

			if(error) {
				console.log(error);
				myPeripheral.disconnect();
			}

			else {

				myPeripheral.discoverAllServicesAndCharacteristics(function(error,services,chars){

					if(error) console.log(error);

					else {

						for(var c=0;c<services.length;c++){

							var theseChars = services[c].characteristics

							for(var i=0;i<theseChars.length;i++){

								if(theseChars[i].uuid==='1111') {

									myChar = theseChars[i];

									setTimeout(function(){
										myPeripheral.connect(function(){
											myPeripheral.discoverAllServicesAndCharacteristics(function(error,services,chars){

												console.log(error); // null

												console.log('.read() is called without error, but it stalls here');

												myChar.read(function(error,data){

													console.log('and this never prints');

													console.log(arguments);
													myPeripheral.disconnect();
												});
											});
										});
									},2000);
								}
							}
						}
					}
					myPeripheral.disconnect();;
				});
			}
		});
	}
});