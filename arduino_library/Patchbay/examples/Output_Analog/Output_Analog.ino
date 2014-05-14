#include <Patchbay.h>
Patchbay patch;

void setup() {
  patch.setup("analogOut",0,1);
  pinMode(3,OUTPUT);
}

void loop() {
  patch.update();
  
  int value = patch.output();
  
  analogWrite(3,value);
}
