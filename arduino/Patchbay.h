///////////
///////////
///////////

#ifndef Patchbay_h
#define Patchbay_h

#include "Arduino.h"
#include "SPI.h"
#include "SoftwareSerial.h"

#include "RFM69.h"
#include "Adafruit_BLE.h"
#include "Adafruit_BluefruitLE_UART.h"

#include "Port.h"

///////////
///////////
///////////


///////////
///////////
///////////

class Patchbay{
  public:
  	
    // initialize with a project ID, project name, input count, and output count
  	Patchbay(byte _id, char *_name,byte _totalInputs=0,byte _totalOutputs=0,byte _network=99,byte _maxLinks=5);

    void begin();
    void begin(boolean verbose);

    // call as often as possible
  	boolean update();

    // read and write with inputs and outputs
    // called by their array position
  	void inputWrite(byte _inIndex, byte _newValue);
    byte inputRead(byte _inIndex);
    boolean inputChanged(byte _outIndex);

  	void outputWrite(byte _outIndex, byte _newValue);
    byte outputRead(byte _outIndex);
    boolean outputChanged(byte _outIndex);

    // make/break a link from local-output to any input
  	void link(byte _outputIndex, boolean _alive, byte _ID, byte _INDEX);

    void inputName(byte index, char * msg);
    void outputName(byte index, char * msg);

  private:

    // RFm12b library from Low Power Lab
  	RFM69 radio;
    void readRadio();
    boolean updateRFM69();

    // functions for helping create the services
    void setupBLE();
    void setupServices();
    void updateBLE();
    void createBLEService(boolean isOutput, byte index);
    void checkOutputLinksRX(Port _p);
    void updateBLELinkCharacteristics(Port _p);
    boolean setBLEChar(byte id, char * val);
    boolean setBLEChar(byte id, char * val, byte len);

    boolean BLEConnected;
    unsigned long BLE_timestamp;
    unsigned long BLE_connected_stamp;
    int BLE_interval;
    int BLE_timeout;
    int BLE_delay;

    // some BLE communication helper functions, for using the UART Friend from Adafruit
    boolean BLE_print_with_OK(char * msg);
    boolean BLE_print_with_OK(char * msg, byte len);
    boolean BLE_print_with_OK(const __FlashStringHelper *msg);
    boolean BLE_print_with_OK(byte msg);
    byte BLE_print_with_int_reply(char * msg);
    byte BLE_print_with_int_reply(const __FlashStringHelper *msg);
    byte BLE_print_with_int_reply(byte msg);

    boolean custom_waitForOK(int timeToWait=100);

  	char* name; // seen on GUI
  	byte patchID; // integer between 0-255
    byte patchNetwork;

  	byte totalInputs;
  	Port *theInputs;

  	byte totalOutputs;
  	Port *theOutputs;

    byte maxLinks;

    // top level flags for if a Port has changed it's value from the previous call to update()
    boolean *outChangeFlag;
    boolean *inChangeFlag;

    // controls the burst messages
  	unsigned long sendStamp;
    int sendInterval;
    byte sendCount;
    int sendThresh;

  	void resetBurst(); // called when an input changes it's value
    void burst(); // broadcasts an array of all INPUT values

    boolean __verbose;
};

#endif

///////////
///////////
///////////