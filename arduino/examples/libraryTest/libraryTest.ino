/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

#include <SPI.h>
#include <SoftwareSerial.h>

#include <RFM69.h>
#include "Adafruit_BLE.h"
#include "Adafruit_BluefruitLE_UART.h"            // soon to be replaced with Adafruit's new SPI version

#include <Patchbay.h>

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

int myNetwork = 99;                               // choose a mesh network to join, between 0-255
int myID = 0;                                     // choose a unique ID for this device, between 0-254 (not 255)

byte total_inputs = 1;                            // total physical INPUT's on this device
byte total_outputs = 1;                           // total physical OUTPUT's on this device

Patchbay patch(myID, "Test", totalInputs, totalOutputs, myNetwork);

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

int sensor_pin = A0;                              // the INPUT is a sensor connected to analog pin 0
int led_pin = D6;                                 // the OUTPUT is an LED connected to digital pin 6

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void setup(){
  
  patch.begin();                                  // initialize radios and create BLE GATT services
  
  patch.inputName(0,"button");                    // assign a name to each INPUT and OUTPUT
  patch.outputName(0,"LED");

  pinMode(led_pin,OUTPUT);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void loop(){

  patch.update();                                 // update all wireless communications

  int new_value = patch.outputRead(0);            // read the OUTPUT value
  analogWrite(led_pin, new_value);                // use it to brighten the LED

  int sensor_value = analogRead(sensor_pin) / 4;  // map the sensor reading to 0-255
  patch.inputWrite(0, sensor_value);              // write the new INPUT value
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////
