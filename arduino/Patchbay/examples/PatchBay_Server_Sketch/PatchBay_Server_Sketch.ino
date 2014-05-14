/*
  The PatchBay's NodeJS server must have an Arduino with the RF12 connected over serial.
  This is the Arduino sketch that acts as a translate between the NodeJS server,
  and the surrounding RF12-enabled Arduinos.
  
  Connect to the computer running the PatchBay NodeJS server, and start the NodeJS server.
  The serialport node-module should automatically open a port with this Arduino, and
  start looking for surrounding devices.
  
  This sketch simply listens for packets received by the RF12, and if a packet is intended
  for the server, it sends it over. Also, when the server is sending a message out, this
  sketch acts as a simple pipe for the message to be converted into RF.
*/

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

#include <RF12.h>

const int redLed = 3;
const int greenLed = 5;
const int yellowLed = 6;

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

const int pingInterval = 30;
unsigned long pingStamp = 0;
const int pingRepeatAmount = 3;
int pingRepeatCounter = 0;
int receiverCount = 0;

const int routerDepth = 32;

char routerBytes[36]; // r + recID + routeID + outPortIndex + inPortIndex + ^
int currentByte = 0;

int myID;


/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void setup() { 
  Serial.begin(57600);
  myID = rf12_configSilent();
  
  // RED: ping sent out
  // GREEN: sending a routing msg
  // YELLOW: received a meta message
  
  for(int i=3;i<9;i++){
    pinMode(i,OUTPUT);
    digitalWrite(i,LOW);
  }
  
  startupBlink();
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void loop() {
  updateIO_server();
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void startupBlink(){
  for(int i=0;i<3;i++){
    digitalWrite(3,HIGH);
    delay(200);
    digitalWrite(3,LOW);
    delay(200);
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void updateIO_server(){
  receiveValues();
  sendPing();
  receiveValues();
  checkSerial();
  receiveValues();
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void sendPing(){
  if(pingStamp+pingInterval<millis() && rf12_canSend()){
    
    digitalWrite(redLed,HIGH); // red means we're pinging them all
    
    int len = 3;
    byte msg[len];
    msg[0] = (byte)'p';
    msg[1] = (byte)1;
    msg[2] = (byte)receiverCount;
    
    // send the value over RF
    rf12_sendStart(0,msg, len);
    rf12_sendWait(0);
    
    digitalWrite(redLed,LOW);
    
    pingStamp = millis();
    pingRepeatCounter = (pingRepeatCounter+1)%pingRepeatAmount;
    if(pingRepeatCounter==0){
      receiverCount = (receiverCount+1)%31;
      if(receiverCount==0){
        receiverCount = 1;
      }
    }
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void receiveValues(){
  // see if we've received a value
  if (rf12_recvDone() && rf12_crc == 0) {
    
    int id = rf12_hdr;
    char type = (char)rf12_data[0];
    int len = (int)(byte)rf12_data[1];
    
    byte data[len];
    for(int i=0;i<len;i++){
      data[i] = (byte)rf12_data[i+2];
    }
    
    switch (type){
      case 'o':
        // pong event from another node, containing it's IO info
        digitalWrite(yellowLed,HIGH); // yellow mean's we got a pong event
        onPongEvent(id,len,data);
        digitalWrite(yellowLed,LOW);
        break;
      case 'x':
        onPokeEvent(id,len,data);
        break;
    }
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void onPokeEvent(int ID,int LEN, byte *data){
  Serial.print("poke");
  Serial.print(',');
  Serial.println(ID);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void onPongEvent(int ID,int LEN, byte *data){
  int thisTotalInputs = (int)data[0];
  int thisTotalOutputs = (int)data[1];
  String thisName = "";
  int thisPortIndex;
  String thisPortName = "";
  String thisPortType = "in";
  int routerRowID;
  byte routerRow[routerDepth];
  for(int i=2;i<LEN;i++){
    if((char)data[i]!='^'){
      thisName += (char) data[i];
    }
    else{
      i++;
      thisPortIndex = (int)data[i];
      if(thisPortIndex>=thisTotalOutputs){
        thisPortType = "out";
        thisPortIndex -= thisTotalOutputs;
      }
      i++;
      for(int n=i;n<LEN;n++){
        if((char)data[n]!='^'){
          thisPortName += (char) data[n];
        }
        else{
          n++;
          routerRowID = (int) data[n];
          n++;
          for(int b=0;b<routerDepth;b++){
            routerRow[b] = (byte)data[n];
            n++;
          }
          break;
        }
      }
      break;
    }
  }
  
  // meta ,ID, NAME, totalIN, totalOUT, portName, portIndex, portType, routerID, routerRow
  Serial.print("meta");
  Serial.print(',');
  Serial.print(ID);
  Serial.print(',');
  Serial.print(thisName);
  Serial.print(',');
  Serial.print(thisTotalInputs);
  Serial.print(',');
  Serial.print(thisTotalOutputs);
  Serial.print(',');
  Serial.print(thisPortName);
  Serial.print(',');
  Serial.print(thisPortIndex);
  Serial.print(',');
  Serial.print(thisPortType);
  Serial.print(',');
  Serial.print(routerRowID);
  Serial.print(',');
  for(int i=0;i<routerDepth;i++){
    Serial.print((int)routerRow[i]);
    if(i<30){
      Serial.print(',');
    }
  }
  Serial.println();
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void checkSerial(){
  // sending router messages (6 bytes i guess)
  while(Serial.available()>0){
    digitalWrite(greenLed,HIGH);
    char inByte = Serial.peek();
    if(inByte!='^'){
      routerBytes[currentByte] = Serial.read();
      currentByte++;
    }
    else if(routerBytes[0]==(byte)'x'){
      // save the to id array
      
    }
    else if(rf12_canSend()){
      
      char trash = Serial.read();
      
      rf12_sendStart(0, routerBytes, currentByte);
      rf12_sendWait(0);
      digitalWrite(greenLed,LOW); // green means we're sending a routing msg
      
      currentByte = 0;
    }
    else{
      break;
    }
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

