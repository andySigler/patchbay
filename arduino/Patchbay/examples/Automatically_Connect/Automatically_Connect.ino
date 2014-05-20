#include <Patchbay.h>
Patchbay patch;

int otherProjectID = 9; // your second Arduino's ID

int inputIndex = 0; // which input will this Arduino listen for?

int ledPin = 3;

void setup() {
  patch.setup("autoLink",0,1); // one output, fading an LED on pin 3
  
  //hardcode this Arduino to listen to your other Arduino
  int myOutputIndex = 0; // since it's just one output, it's index is at 0
  patch.listenTo( myOutputIndex , otherProjectID , inputIndex );
  
  // set the ledPin to be an output pin
  pinMode(ledPin,OUTPUT);
}

void loop() {
  patch.update();
  
  // unless a Patchbay breaks the connections, this Arduino
  // will always listen to the other Arduino and it's input value
  int ledValue = patch.output();
  analogWrite(ledPin,ledValue);
}
