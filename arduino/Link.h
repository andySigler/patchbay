///////////
///////////
///////////

#ifndef Link_h
#define Link_h

#include "Arduino.h"

///////////
///////////
///////////

class Link{
  public:
  	
	Link();

	void create(byte _hardwareAddress,byte _inputIndex);
	void kill();
	void writeValue(byte _value);
	void clone(Link tempLink);
	boolean hasChanged();
	byte readValue();
	boolean testMessage(byte ID, byte totalValues, byte *values);
	boolean matches(byte _ID, byte _INDEX);

	boolean isAlive(); // get state
	void isAlive(boolean _state); // set state

  // private:

  	byte HARDWARE_ADDRESS;
	byte INPUT_INDEX;
	byte theValue;
	boolean didChange;

	boolean alive;


};

#endif

///////////
///////////
///////////