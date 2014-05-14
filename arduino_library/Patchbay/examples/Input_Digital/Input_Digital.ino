#include <Patchbay.h>
Patchbay patch;

void setup() {
  patch.setup("digitalIn",1,0);
  pinMode(3,INPUT);
}

void loop() {
  patch.update();
  
  int value = digitalRead(3);
  value = map(value,LOW,HIGH,0,255);
  
  patch.input(value); 
}
