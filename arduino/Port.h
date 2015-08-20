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

    void init();

    boolean update();
    void createLinks(byte _totalLinks);
  	byte getValue();
  	void setTargetValue(byte _value);

    void setSlide(float _slide);

    void ble_service(byte _name_ID,byte _links_tx_ID,byte _links_rx_ID);
    boolean parseRXChar(char * _hexString);

    byte name_ID;
    byte links_tx_ID;
    byte links_rx_ID;

    byte totalLinks;

    /* ~~~~~~~~~~ OUTPUT ONLY ~~~~~~~~~~ */

        // new radio messages are passed here to be tested
        void newMessage(byte ID,byte totalValues,byte *values);

        boolean createLink(byte _ID,byte _INDEX);
        boolean killLink(byte _ID,byte _INDEX);

        void createBLEValue(char * returnString, byte returnString_len);

    /* ~~~~~~~~~~ */

  private:

    boolean smoothValue();

    // loop through links, reading it's value if it's changed
    void readLinks();

    float theValue;
    byte targetValue;

    float theSlide;

    Link *theLinks;

};

#endif

///////////
///////////
///////////