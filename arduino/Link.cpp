///////////
///////////
///////////

/*

	A "Link" is held by a port (OUTPUT port only for now)
	A links stores a Node's ID, and the index of one of it's inputs (being sent wirelessly)
	This allows one port to have multiple links, and dyanimcally update and change them

*/

#include "Link.h"

///////////
///////////
///////////

Link::Link(){
}

///////////
///////////
///////////

void Link::init(){
	theValue = 0;
	didChange = false;
	alive= false;
};

///////////
///////////
///////////

// save the ID and index of this Link
// setting "alive" to true will activate this link

void Link::create(byte _hardwareAddress, byte _inputIndex){
	HARDWARE_ADDRESS = _hardwareAddress;
	INPUT_INDEX = _inputIndex;
	theValue = 0;
	alive = true;
	didChange = false;
};

///////////
///////////
///////////

// set "alive" to false will deactivate this link

void Link::kill(){
	alive = false;
	didChange = false;
};

///////////
///////////
///////////

boolean Link::isAlive(){
	return alive;
}

///////////
///////////
///////////

void Link::isAlive(boolean _state){
	alive = _state;
}

///////////
///////////
///////////

boolean Link::testMessage(byte ID, byte totalValues, byte *values) {
	if(HARDWARE_ADDRESS==ID && INPUT_INDEX<totalValues){
		writeValue(values[INPUT_INDEX]); // write the new message to a Link
		return true;
	}
	else {
		return false;
	}
}

///////////
///////////
///////////

boolean Link::matches(byte _ID, byte _INDEX) {
	if(HARDWARE_ADDRESS==_ID && INPUT_INDEX==_INDEX){
		return true;
	}
	else {
		return false;
	}
}

///////////
///////////
///////////

// write a new value, if it's a different value, we changed!

void Link::writeValue(byte _value){
	if(theValue!=_value){
		didChange = true;
	}
	theValue = _value;
};

///////////
///////////
///////////

// with an inputed link, copy all of it's properties

void Link::clone(Link tempLink){
	HARDWARE_ADDRESS = tempLink.HARDWARE_ADDRESS;
	INPUT_INDEX = tempLink.INPUT_INDEX;
	theValue = tempLink.theValue;
	didChange = tempLink.didChange;
	alive = tempLink.alive;
};

///////////
///////////
///////////

// check to see if this link has changed
// if it's true, the flag is set to false

boolean Link::hasChanged(){
	return didChange;
};

///////////
///////////
///////////

// get the Link's current value (0-255)

byte Link::readValue(){
	return theValue;
};

///////////
///////////
///////////