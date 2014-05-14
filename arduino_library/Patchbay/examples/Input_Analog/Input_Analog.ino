#include <Patchbay.h>
Patchbay patch;

void setup() {
  patch.setup("analogIn",1,0);
}

void loop() {
  patch.update();
  
  int value = analogRead(A0);
  value = map(value,0,1023,0,255);
  
  patch.input(value); 
}
