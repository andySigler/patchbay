#include <Patchbay.h>
Patchbay patch;

char* inNames[] = {"knob","button","slider","piezo","photoCell","temp"};
char* outNames[] = {"redLED","greenLED","blueLED","servoAngle","dcSpeed","tonePitch"};

int PWMpins[] = {3,5,6,9,10,11};

void setup() {
  patch.setup("Multiple",6,6);
  for(int index=0;index<6;index++){
    pinMode(PWMpins[index],OUTPUT);
    patch.setInputName(inNames[index]);
    patch.setOutputName(outNames[index]);
  }
}

void loop() {
  patch.update();
  
  for(int index=0;index<6;index++){
    int val = map(analogRead(index),0,1023,0,255);
    patch.input(index,val);
  }
    
  for(int i=0;i<6;i++){
    int val = patch.output(i);
    analogWrite(PWMpins[i],val);
  }
}
