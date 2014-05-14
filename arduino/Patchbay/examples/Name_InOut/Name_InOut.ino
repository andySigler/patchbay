#include <Patchbay.h>
Patchbay patch;

int sensorPin = A0;
int ledPin = 3;

void setup() {
  patch.setup("addNames",1,1);
  patch.setInputName("myKnob");
  patch.setOutputName("myLED");
  
  pinMode(ledPin,OUTPUT);
}

void loop() {
  patch.update();
  
  int inValue = analogRead(sensorPin); // read from sensor
  inValue = (int)map(inValue,0,1023,0,255); // map to 0-255
  
  patch.input(inValue); 
  
  int outValue = patch.output();
  analogWrite(ledPin,outValue);
}
