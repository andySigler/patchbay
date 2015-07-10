///////////
///////////
///////////

#include "Patchbay.h"

///////////
///////////
///////////

// Create an instance of the BLE object, using the default pins

// RX is on pin 4
// TX is on pin 7
// RTS is on pin 8
// CTS is on pin 9
// all other optional pins aren't being used, so they're set to -1
SoftwareSerial bluefruitSS = SoftwareSerial(7, 4); // TX, RX
Adafruit_BluefruitLE_UART ble(bluefruitSS,-1,9,8); // SS Object, Mode, RTS, CTS

///////////
///////////
///////////

Patchbay::Patchbay(byte _id, char *_name,byte _totalInputs,byte _totalOutputs,byte _network,byte _maxLinks){
	name = _name;
	patchID = _id;
	patchNetwork = _network;

	maxLinks = _maxLinks;

	totalInputs = _totalInputs;
	totalOutputs = _totalOutputs;

	if(totalInputs>0){
		theInputs = (Port *)malloc(sizeof(Port) * totalInputs);
		inChangeFlag = (boolean *)malloc(sizeof(boolean) * totalInputs);
	}
	if(totalOutputs>0){
		theOutputs = (Port *)malloc(sizeof(Port) * totalOutputs);
		outChangeFlag = (boolean *)malloc(sizeof(boolean) * totalOutputs);

		// each OUTPUT has a certain number of possible links.
		// i'm not sure if this should be an optional thing or not
		for(byte i=0;i<totalOutputs;i++){
			theOutputs[i].createLinks(maxLinks); // defaults to 5 links per output
		}
	}

	__verbose = false;
}

///////////
///////////
///////////

void Patchbay::begin(boolean verbose) {

	__verbose = verbose;

	begin();
}

void Patchbay::begin() {

	// init all our variables

	sendCount = 0;
	sendThresh = 5; // how many times it will burst
	sendStamp = 0;
	sendInterval = 20; // milliseconds between bursting broadcasts

	BLEConnected = false;

	BLE_connected_stamp = 0; // time stamp for last time we connected
	BLE_timeout = 5000; // will only stay connected for 5 seconds at most

	BLE_interval = 200; // how often it will check the BLE Characteristics
	BLE_timestamp = 0; // time stamp for the last time we checked our BLE stuff

	BLE_delay = 200; // default delay time for when writing to the BLE module's SS port


	//  then init both the radios

	if(__verbose) Serial.println(F("starting Patchbay"));

	if(__verbose) Serial.println(F("starting BLE..."));

	// set device name and all Services needed
	setupBLE();

	// start the SPI communication with our RFM69
	radio.initialize(RF69_915MHZ,patchID,patchNetwork);

	if(__verbose) Serial.println(F("rfm69 initialized, Patchbay started"));
}

///////////
///////////
///////////

boolean Patchbay::update(){
	
	updateBLE();

	return updateRFM69(); // returns TRUE if an Output's value has changed
}

///////////
///////////
///////////

void Patchbay::updateBLE() {

	// check BLE things on much slower interval

	if(BLE_timestamp + BLE_interval < millis()) {

		// did we just connect between now and our last call to update()
		boolean tempConnectionStatus = ble.isConnected();
		if(!BLEConnected && tempConnectionStatus) {

			//if(__verbose) Serial.println(F("\nBLE Connected\n"));

			// we just connected!!!!!
			BLE_connected_stamp = millis();
		}
		else if(BLEConnected && !tempConnectionStatus){
			//if(__verbose) Serial.println(F("\nBLE Disconnected\n"));
		}

		BLEConnected = tempConnectionStatus;

		// general "connected" updated
		if(BLEConnected) {

			// check to see if the TX link char has been written to

			for(byte i=0;i<totalOutputs;i++) {
				checkOutputLinksRX(theOutputs[i]);
			}


			// if we've been connected too long, initial disconnection from central
			if(BLE_connected_stamp + BLE_timeout < millis()) {
				boolean didDisconnect = BLE_print_with_OK(F("AT+GAPDISCONNECT"));
				if(__verbose) Serial.print(F("Disconnected? "));Serial.println(didDisconnect);
			}

		}

		BLE_timestamp = millis();
	}
}

///////////
///////////
///////////

boolean Patchbay::updateRFM69() {
	// then update the RFm69's properties

	readRadio();

	boolean anOutputHasChanged = false;

	for(byte i=0;i<totalOutputs;i++){
		// check to see if each Link has changed
		// if the Link has changed, the Link will set the Port's value
		theOutputs[i].readLinks();
		if(theOutputs[i].hasChanged()){
			outChangeFlag[i] = true;

			anOutputHasChanged = true; // return true to the sketch, so we know an outputs changed
		}
		else {
			outChangeFlag[i] = false;
		}
	}

	// update the INPUTs and bursts
	for(byte i=0;i<totalInputs;i++){
		if(theInputs[i].hasChanged()){
			inChangeFlag[i] = true;

			resetBurst(); // this reset the radio's broadcasting burst
		}
		else {
			inChangeFlag[i] = false;
		}
	}

	burst();

	return anOutputHasChanged;
}

///////////
///////////
///////////

void Patchbay::checkOutputLinksRX(Port _p){

	ble.print(F("AT+GATTCHAR="));
	ble.println(_p.links_rx_ID);

	// get how many bytes were returned
	ble.readline(50);

	// then pass the BLE buffer, and parse the HEX string
	boolean gotNewLinkValue = _p.parseRXChar(ble.buffer);

	custom_waitForOK(); // then wait for the OK
	
	if(gotNewLinkValue) {

		updateBLELinkCharacteristics(_p);
	}
}

///////////
///////////
///////////

void Patchbay::resetBurst(){
	sendCount = 0;
}

///////////
///////////
///////////

void Patchbay::burst(){
	if(sendCount<sendThresh){
		unsigned long now = millis();
		if(sendStamp+sendInterval<now){

			// turn the input vaues into a byte array
			// can accept up to 128 inputs
			byte packet[totalInputs];
			for(byte i=0;i<totalInputs;i++){
				packet[i] = (byte) theInputs[i].getValue();
			}

			// send the packet internally first
			for(byte i=0;i<totalOutputs;i++){
				// newMessage loops through that Port's Links, writing the value if they match IDs
				theOutputs[i].newMessage(patchID,totalInputs,packet);
			}


			radio.send(255,packet,totalInputs); // add 1 to the length of bytes (????)

			// then incrememnt sendCount and sendStamp
			sendCount++;
			sendStamp = now;
		}
	}
}

///////////
///////////
///////////

void Patchbay::readRadio(){
	// read from the radio if there is any message
	if (radio.receiveDone()){

		byte totalValues = radio.DATALEN;

		if(totalValues>0){

			byte senderID = radio.SENDERID;
			byte values[totalValues];

			// parse the message into ID, totalValues, and an array of the values
			for (byte i=0;i<totalValues;i++){
				values[i] = (byte) radio.DATA[i];
			}

			// if there is a message, turn it into an ID and array, and pass it to each OUTPUT
			for(byte i=0;i<totalOutputs;i++){
				// newMessage loops through that Port's Links, writing the value if they match IDs
				theOutputs[i].newMessage(senderID,totalValues,values);
			}
		}
	}
}

///////////
///////////
///////////

// create a link

void Patchbay::link(byte _outputIndex, boolean _alive, byte _ID, byte _INDEX){
	if(_outputIndex<totalOutputs){
		// the port will manage the links
		if(_alive){
			theOutputs[_outputIndex].createLink(_ID,_INDEX);
		}
		else{
			theOutputs[_outputIndex].killLink(_ID,_INDEX);
		}

		byte characterIndex = theOutputs[_outputIndex].links_tx_ID;
		if(characterIndex != 0 && characterIndex !=255) {

			updateBLELinkCharacteristics(theOutputs[_outputIndex]);
		}
	}
}

///////////
///////////
///////////

// each PORT has an identical interface to the value (not link)
// these might prove to be confusing, but seems ok for now...

void Patchbay::inputWrite(byte _inIndex, byte _newValue){
	if(_inIndex<totalInputs){
		if(_newValue>255){
			_newValue=255;
		}
		else if(_newValue<0){
			_newValue=0;
		}
		theInputs[_inIndex].setValue(_newValue);
	}
}

///////////
///////////
///////////

void Patchbay::outputWrite(byte _outIndex, byte _newValue){
	if(_outIndex<totalOutputs){
		if(_newValue>255){
			_newValue=255;
		}
		else if(_newValue<0){
			_newValue=0;
		}
		theOutputs[_outIndex].setValue(_newValue);
	}
}

///////////
///////////
///////////

boolean Patchbay::inputChanged(byte _inIndex){
	if(_inIndex<totalInputs){
		return inChangeFlag[_inIndex];
	}
	else{
		return false;
	}
}

///////////
///////////
///////////

boolean Patchbay::outputChanged(byte _outIndex){
	if(_outIndex<totalOutputs){
		return outChangeFlag[_outIndex];
	}
	else{
		return false;
	}
}

///////////
///////////
///////////

byte Patchbay::inputRead(byte _inIndex){
	if(_inIndex<totalInputs){
		return theInputs[_inIndex].getValue();
	}
	else{
		return 0;
	}
}

///////////
///////////
///////////

byte Patchbay::outputRead(byte _outIndex){
	if(_outIndex<totalOutputs){
		return theOutputs[_outIndex].getValue();
	}
	else{
		return 0;
	}
}

///////////
///////////
///////////

const char __letters__[16] = {'0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'};

void Patchbay::setupBLE(){

	// below are configuration settings for the BLE module

	// start the UART communication with our nRF51822
	while ( !ble.begin(false)) {
		if(__verbose) Serial.println("fuck");
		Serial.println(F("Couldn't find Bluefruit"));
		delay(BLE_delay);
	}

	// turn off Advertisements!!
	if(!BLE_print_with_OK(F("AT+GAPSTOPADV"))) {
		if(__verbose) 	Serial.println("Couldn't stop advertising!!");
	}

	while(!BLE_print_with_OK(F("AT+GATTCLEAR"))){
		Serial.println("Couldn't clear GATT...");
		delay(500);
	}


	// do a factory reset (why not?)
	// while (!ble.factoryReset()) {
	// 	Serial.println(F("Couldn't factory reset"));
	// 	delay(BLE_delay);
	// }

	// tell it to shutup
	ble.echo(false);

	// and then add this project's name
	ble.print("AT+GAPDEVNAME=");
	ble.print(name);
	ble.print(F("~")); // separate the name from ID/Network HEX's
	ble.print(__letters__[patchID/16]);
    ble.print(__letters__[patchID%16]);
    ble.print(__letters__[patchNetwork/16]);
    ble.print(__letters__[patchNetwork%16]);
	if(!BLE_print_with_OK(F(""))) {
		Serial.println("Couldn't set device name");
		while(true){}
	}

	// turn off Advertisements!!
	if(!BLE_print_with_OK(F("AT+GAPSTOPADV"))) {
		if(__verbose) Serial.println("Couldn't stop advertising!!");
	}

	setupServices();

	// turn off Advertisements!!
	if(!BLE_print_with_OK(F("AT+GAPSTARTADV"))) {
		if(__verbose) Serial.println("Couldn't restart advertising...");
	}
}

///////////
///////////
///////////

void Patchbay::setupServices(){

	if(__verbose) Serial.println(F("adding input services..."));
	for(byte i=0;i<totalInputs;i++) {
		createBLEService(false,i);
	}
	if(__verbose) Serial.println(F("adding output services..."));
	for(byte o=0;o<totalOutputs;o++) {
		createBLEService(true,o);
	}

	if(__verbose) Serial.print(F("resetting ble.."));
	while(!ble.reset()) {
		if(__verbose) Serial.print(F("."));
		delay(BLE_delay);
	}
	if(__verbose) Serial.println(F(""));

	// turn off Advertisements!!
	if(!BLE_print_with_OK(F("AT+GAPSTOPADV"))) {
		if(__verbose) Serial.println("Couldn't stop advertising!!");
	}

	// now give each Port an inital value for its links_rx & links_tx char
	for(byte i=0;i<totalOutputs;i++) {

		updateBLELinkCharacteristics(theOutputs[i]);
	}
}

///////////
///////////
///////////

// create a service for each Port, including all it's characteristics
void Patchbay::createBLEService(boolean isOutput, byte _index) {

	byte name_ID;
	byte links_tx_ID;
	byte links_rx_ID;

	// separate the Input and Output service by giving them different service UUIDs
	if(isOutput) {
		ble.print(F("AT+GATTADDSERVICE=UUID=0x78")); // Output
	}
	else {
		ble.print(F("AT+GATTADDSERVICE=UUID=0x68")); // Input
	}

	// incase the index is only 1 digit, add a 0 digit
	if(_index<10) {
		ble.print(F("0"));
	}

	// give this Service a unique UUID, based off it's index
	byte service_ID = BLE_print_with_int_reply(_index);
	if(__verbose) Serial.print(F("\t"));Serial.println(service_ID);


	// create the characteristics, and save each ID


	// create the NAME characteristic    
    name_ID = BLE_print_with_int_reply(F("AT+GATTADDCHAR=UUID=0x1110, PROPERTIES=0x02, MIN_LEN=1, MAX_LEN=20"));
    if(__verbose) Serial.print(F("\t\t"));Serial.println(name_ID);


    // Link services only needed for OUTPUTs
    if(isOutput){

	    // create the LINKS_TX characteristic
	    ble.print(F("AT+GATTADDCHAR=UUID=0x1111, PROPERTIES=0x02, MIN_LEN=1, MAX_LEN="));	    
	    links_tx_ID = BLE_print_with_int_reply(maxLinks * 2); // only need 2 bytes per link
	    if(__verbose) Serial.print(F("\t\t"));Serial.println(links_tx_ID);

    	// create the LINKS_RX characteristic	    
	    links_rx_ID = BLE_print_with_int_reply(F("AT+GATTADDCHAR=UUID=0x1112, PROPERTIES=0x08, MIN_LEN=3, MAX_LEN=3"));
	    if(__verbose) Serial.print(F("\t\t"));Serial.println(links_rx_ID);
	}


	// save the Service's reference ID's in the appropriate Port
	if(isOutput) {
		theOutputs[_index].ble_service(name_ID, links_tx_ID, links_rx_ID);
	}
	else {
		theInputs[_index].ble_service(name_ID, links_tx_ID, links_rx_ID);
	}
}

///////////
///////////
///////////

void Patchbay::updateBLELinkCharacteristics(Port _p) {
	// if the link values have updated, then update the TX char
	// now give each Port an inital value for its links_rx char
	byte numLinks = (_p.totalLinks * 6) - 1;

	char val[numLinks];

	_p.createBLEValue( val , numLinks);

	boolean TXsuccess = setBLEChar(_p.links_tx_ID, val, numLinks);

	boolean RXsuccess = setBLEChar(_p.links_rx_ID, "FF-FF-FF");
}

///////////
///////////
///////////

void Patchbay::inputName(byte index, char * msg){
	if(index<totalInputs) {
		boolean success = setBLEChar(theInputs[index].name_ID, msg);
		if(__verbose) Serial.print(F("Success writing to char? "));Serial.println(success);
	}
}

///////////
///////////
///////////

void Patchbay::outputName(byte index, char * msg){
	if(index<totalOutputs) {
		boolean success = setBLEChar(theOutputs[index].name_ID, msg);
		if(__verbose) Serial.print(F("Success writing to char? "));Serial.println(success);
	}
}

///////////
///////////
///////////

boolean Patchbay::setBLEChar(byte id, char * val){

	ble.print(F("AT+GATTCHAR="));
	ble.print(id);
	ble.print(F(","));

	return BLE_print_with_OK(val);
}

boolean Patchbay::setBLEChar(byte id, char * val, byte len){

	ble.print(F("AT+GATTCHAR="));
	ble.print(id);
	ble.print(F(","));

	return BLE_print_with_OK(val, len);
}

///////////
///////////
///////////

boolean Patchbay::BLE_print_with_OK(char * msg) {
  delay(BLE_delay);
  byte len = strlen(msg);
  for(byte i=0;i<len;i++) {
  	ble.print(msg[i]);
  }
  ble.println();
  return custom_waitForOK();
}

boolean Patchbay::BLE_print_with_OK(char * msg, byte len) {
  delay(BLE_delay);
  for(byte i=0;i<len;i++) {
  	ble.print(msg[i]);
  }
  ble.println();
  return custom_waitForOK();
}

boolean Patchbay::BLE_print_with_OK(const __FlashStringHelper *msg) {
  delay(BLE_delay);
  ble.println(msg);
  return custom_waitForOK();
}

boolean Patchbay::BLE_print_with_OK(byte msg) {
  delay(BLE_delay);
  ble.println(msg);
  return custom_waitForOK();
}

///////////
///////////
///////////

byte Patchbay::BLE_print_with_int_reply(char * msg) {
  delay(BLE_delay);
  uint32_t reply = 0;
  byte len = strlen(msg);
  for(byte i=0;i<len;i++) {
  	ble.print(msg[i]);
  }
  ble.sendCommandWithIntReply(F(""), &reply);
  return reply;
}

byte Patchbay::BLE_print_with_int_reply(const __FlashStringHelper *msg) {
  delay(BLE_delay);
  uint32_t reply = 0;
  ble.println(msg);
  ble.sendCommandWithIntReply(F(""), &reply);
  return reply;
}

byte Patchbay::BLE_print_with_int_reply(byte msg) {
  delay(BLE_delay);
  uint32_t reply = 0;
  ble.println(msg);
  ble.sendCommandWithIntReply(F(""), &reply);
  return reply;
}

///////////
///////////
///////////

boolean Patchbay::custom_waitForOK(int timeToWait) {
  while (ble.readline(timeToWait)) {
    if (strcmp(ble.buffer, "OK") == 0) return true;
  }
  return false;
}

///////////
///////////
///////////