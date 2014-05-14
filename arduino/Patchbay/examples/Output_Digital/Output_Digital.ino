#include <Patchbay.h>
Patchbay patch;

int THRESHOLD = 127;

void setup() {
  patch.setup("analogOut",0,1);
  pinMode(3,OUTPUT);
}

void loop() {
  patch.update();
  
  int value = patch.output();
  value = map(value,0,THRESHOLD,LOW,HIGH);
  
  digitalWrite(3,value);
}
