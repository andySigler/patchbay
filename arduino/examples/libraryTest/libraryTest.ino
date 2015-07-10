/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

#define __patchbay__verbose 1

#include <SPI.h>
#include <SoftwareSerial.h>

#include <RFM69.h>
#include "Adafruit_BLE.h"
#include "Adafruit_BluefruitLE_UART.h"

#include <PatchbayBeta.h>

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

int myID = 0;
int myNetwork = 99;

byte totalInputs = 5;
byte totalOutputs = 5;

PatchbayBeta patch(myID, "Patchbay", totalInputs, totalOutputs, myNetwork);

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void setup(){
  
  Serial.begin(115200);
  
  Serial.println(F("starting Patchbay..."));
  
  pinMode(5,OUTPUT);
  digitalWrite(5,HIGH);
  
  patch.begin(true);
  
  digitalWrite(5,LOW);
  
  Serial.println(F("setting names..."));
  
  char * inName = "button-0";
  byte inNameLen = strlen(inName);
  
  for(byte i=0;i<totalInputs;i++){
    patch.inputName(i,inName);
    inName[inNameLen-1] = (char)(49 + i);
  }
  
  char * outName = "LED-0";
  byte outNameLen = strlen(outName);
  
  for(byte i=0;i<totalOutputs;i++){
    patch.outputName(i,outName);
    patch.link(i, true, myID, i); // tell each LED to listen to a button
    outName[outNameLen-1] = (char)(49 + i);
  }
  
  Serial.println(F("entering loop..."));
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void loop(){
  if(patch.update()) {
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////
