///////////
///////////
///////////

/*

	Both inputs and outputs are a port
	The port holds on to the value
	A port can have any number of Links (right now, only outputs have links)

*/

#include "Port.h"

///////////
///////////
///////////

Port::Port(){
}

///////////
///////////
///////////

void Port::init(){
	totalLinks = 0;

    name_ID = 0;
    links_tx_ID = 0;
    links_rx_ID = 0;

    theSlide = 1;
    targetValue = 0;
    theValue = 0;
}

///////////
///////////
///////////

void Port::createLinks(byte _totalLinks){
	totalLinks = _totalLinks;
	if(totalLinks>0){
		theLinks = (Link *)malloc(sizeof(Link) * _totalLinks);
		for(byte i=0;i<totalLinks;i++) {
			theLinks[i].init();
			theLinks[i].kill(); // initialize all links to be empty
		}
	}
}

///////////
///////////
///////////

boolean Port::update(){

	// if there are links, update the target value
	if(totalLinks>0) {
		readLinks();
	}

	// change the actual value we're using (based off target)
	return smoothValue(); // returns a 'didChange' flag
}

///////////
///////////
///////////

byte Port::getValue(){
	return (byte)theValue;
}

///////////
///////////
///////////

void Port::setTargetValue(byte _value){
	targetValue = _value;
}

///////////
///////////
///////////

void Port::setSlide(float _slide){
	if(_slide>=1) {
		theSlide = _slide;
	}
	else {
		theSlide = 1;
	}
}

///////////
///////////
///////////

// take the current target value, and smooth it
boolean Port::smoothValue(){

	/*
		y (n) = y (n-1) + ((x (n) - y (n-1))/slide)
	*/

	float oldValue = theValue;

	float diff = ((float)targetValue) - theValue;

	if(abs(diff)>0.001) {
		float stepAmount = diff / theSlide;

		theValue = theValue + stepAmount;

		if(theValue<0) {
			theValue = 0;
		}
		if(theValue>255) {
			theValue = 255;
		}
	}
	else {
		theValue = (float)targetValue;
	}

	// then finally check to see if it has changed
	if(theValue!=oldValue){
		return true;			// did we change?
	}
	else {
		return false;			// did we change?
	}
}

///////////
///////////
///////////

// this is called every update()
// we read each Link, and if the Link has changed, we read from it
// all Ports read from their Links only!

void Port::readLinks(){
	for(byte i=0;i<totalLinks;i++){
		if(theLinks[i].isAlive()){
			if(theLinks[i].hasChanged()){ // if the link's value has been updated...
				setTargetValue(theLinks[i].readValue()); // ... then read from the link
			}
		}
		else{
			break; // because alive links are at the front of the array
		}
	}
}

///////////
///////////
///////////

// looping through all links on a new radio message feels inefficient
// we'll see if this plays a part in any sort of latency...

void Port::newMessage(byte ID,byte totalValues,byte *values){
	for(byte i=0;i<totalLinks;i++){
		if(theLinks[i].isAlive()){
			if(theLinks[i].testMessage(ID,totalValues,values)){
				break;
			}
		}
		else{
			break; // because alive links are at the front of the array
		}
	}
}

///////////
///////////
///////////

boolean Port::createLink(byte _ID,byte _INDEX){
	// first, test to see if it already exists
	for(byte i=0;i<totalLinks;i++){
		if(theLinks[i].isAlive()){
			if(theLinks[i].matches(_ID,_INDEX)){
				return false; // nothing happened
			}
		}
	}

	// copy each link, erasing the last one
	for(byte i=totalLinks-1;i>0;i--){
		theLinks[i].clone(theLinks[i-1]);
	}
	// turn the first link into the new one
	theLinks[0].create(_ID,_INDEX);

	return true; // something changed
}

///////////
///////////
///////////

boolean Port::killLink(byte _ID,byte _INDEX){
	for(byte i=0;i<totalLinks-1;i++){
		if(theLinks[i].isAlive()){
			if(theLinks[i].matches(_ID,_INDEX)){
				theLinks[i].kill();
				for(byte n=i;n<totalLinks-1;n++){
					theLinks[n].clone(theLinks[n+1]); // keep alive links at the front of the array
				}
				// then kill the last link, just incase it's not
				theLinks[totalLinks-1].kill();
				return true; // something changed
			}
		}
	}

	return false; // nothing happened
}

///////////
///////////
///////////

void Port::ble_service(byte _name_ID,byte _links_tx_ID,byte _links_rx_ID) {
    name_ID = _name_ID;
    links_tx_ID = _links_tx_ID;
    links_rx_ID = _links_rx_ID;
}

///////////
///////////
///////////

// returns true if a change occured

boolean Port::parseRXChar(char * _hexString){

	// this string will only contain 3 HEX bytes
	// first byte is the Link's ID
	// second byte is the Link's Index
	// third byte is the a aliveFlag (1 == create, 0 == kill)

	if(strlen(_hexString)==8) { // 00-00-00

		byte tempID = 255;
		byte tempIndex = 255;
		byte tempAliveFlag = 255;

		char temp[2]; // temp char array to hold HEX string

		temp[0] = _hexString[0];
		temp[1] = _hexString[1];
		tempID = strtoul(temp,NULL,16);

		temp[0] = _hexString[3];
		temp[1] = _hexString[4];
		tempIndex = strtoul(temp,NULL,16);

		temp[0] = _hexString[6];
		temp[1] = _hexString[7];
		tempAliveFlag = strtoul(temp,NULL,16);

		if(tempID!=(byte)255 && tempIndex!=(byte)255 && tempAliveFlag!=(byte)255) {

			if(tempAliveFlag > 0) {
				return createLink(tempID, tempIndex); // created new link!!
			}
			else if(tempAliveFlag==0) {
				return killLink(tempID, tempIndex); // erased a link!!
			}
			else {
				return false;
			}
		}
	}

	return false;
}

///////////
///////////
///////////

const char __letters__[16] = {'0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'};

void Port::createBLEValue(char * returnString, byte returnString_len) {

	byte index_counter = 0;

    for(byte i=0;i<totalLinks;i++) {

    	// add the dash if this isn't the first value
		if(index_counter>0) {
			returnString[index_counter] = '-';
			index_counter++;
		}

    	if(theLinks[i].isAlive()) {

    		// convert the ID into HEX chars
    		byte nextIndex = theLinks[i].HARDWARE_ADDRESS / 16;
    		returnString[index_counter] = __letters__[nextIndex];
    		index_counter++;

    		nextIndex = theLinks[i].HARDWARE_ADDRESS % 16;
    		returnString[index_counter] = __letters__[nextIndex];
    		index_counter++;

    		returnString[index_counter] = '-';
    		index_counter++;


    		nextIndex = theLinks[i].INPUT_INDEX / 16;
    		returnString[index_counter] = __letters__[nextIndex];
    		index_counter++;

    		nextIndex = theLinks[i].INPUT_INDEX % 16;
    		returnString[index_counter] = __letters__[nextIndex];
    		index_counter++;
    	}
    	else {
    		byte nextIndex = 15;
    		returnString[index_counter] = __letters__[nextIndex];
    		index_counter++;

    		nextIndex = 15;
    		returnString[index_counter] = __letters__[nextIndex];
    		index_counter++;

    		returnString[index_counter] = '-';
    		index_counter++;
    		
    		nextIndex = 15;
    		returnString[index_counter] = __letters__[nextIndex];
    		index_counter++;

    		nextIndex = 15;
    		returnString[index_counter] = __letters__[nextIndex];
    		index_counter++;
    	}
    }
}

///////////
///////////
///////////