///////////
///////////
///////////

#ifndef Port_h
#define Port_h

#include "Arduino.h"
#include "Link.h"

///////////
///////////
///////////

class Port{
  public:
  	
  	Port();
    void createLinks(byte _totalLinks);
  	byte getValue();
  	void setValue(byte _value);
  	boolean hasChanged();

    void ble_service(byte _name_ID,byte _links_tx_ID,byte _links_rx_ID);
    boolean parseRXChar(char * _hexString);

    byte name_ID;
    byte links_tx_ID;
    byte links_rx_ID;

    byte totalLinks;

    /* ~~~~~~~~~~ OUTPUT ONLY ~~~~~~~~~~ */

        // new radio messages are passed here to be tested
        void newMessage(byte ID,byte totalValues,byte *values);

        // loop through links, reading it's value if it's changed
        void readLinks();

        boolean createLink(byte _ID,byte _INDEX);
        boolean killLink(byte _ID,byte _INDEX);

        void createBLEValue(char * returnString, byte returnString_len);

    /* ~~~~~~~~~~ */

  private:

    byte theValue;
    boolean didChange;

    Link *theLinks;

};

#endif

///////////
///////////
///////////