/*
	Patchbay.cpp - Library for killin it.
	Created by Andy Sigler, March 20, 2014.
	Released into the public domain.
*/

// #include <string>
#include "Arduino.h"
#include "RF12.h"
#include "Patchbay.h"

Patchbay::Patchbay(){

	sendInterval = 10;
	sendStamp = 0;

	outburstCounter = 0;
	outburstThresh = 40;

	routerIDs = 32;
	routerDepth = 32;
	router[routerIDs+1][routerDepth];

	pingWaitTime = 5000;
	pingStamp = 0;

	serverConnection = false;
	shouldPong = false;

	pongedPort = 0;
	pongedRouterIDThing = 0;
  pongedCounter = 0;
  pongedCounterThresh = 2;

  routerReply = false;
  routerReplyID = 0;
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::setup(char* _name,int ins,int outs){
	ID = rf12_configSilent();
	name = _name;

	totalOutputs = outs;
	totalInputs = ins;

	for(int y=0;y<routerIDs+1;y++){
		for(int x=0;x<routerDepth;x++){
			router[y][x] = (byte)99;
		}
	}

  for(int i=0;i<31;i++){
    inputNames[i] = "in";
    outputNames[i] = "out";
  }

  if(pongedPort>0){
    pongedPort = 0;
  }

  routerReply = false;
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::listenTo(int myOutput, int tempID, int theirInput){
  Serial.println("one");
  Serial.print(tempID);
  Serial.print(" , ");
  Serial.print(theirInput);
  Serial.print(" , ");
  Serial.println(myOutput);
  if(tempID<routerIDs && theirInput<routerDepth && myOutput<totalOutputs){
    Serial.println("two");
    router[tempID][theirInput] = (byte) myOutput;
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::update(){
  receiveValues();
  selfRouter();

  receiveValues();
  sendTest();

  receiveValues();
  checkServer();

  receiveValues();
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::selfRouter(){
  for(int i=0;i<totalInputs;i++){
    
    int outputIndex = (int)router[0][i];
    if(outputIndex!=99 && outputIndex<totalOutputs){
      outputValues[outputIndex] = inputValues[i];
    }

    outputIndex = (int)router[ID][i];
    if(outputIndex!=99 && outputIndex<totalOutputs){
      outputValues[outputIndex] = inputValues[i];
    }
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::input(int i,int val,float slide){
  // y (n) = y (n-1) + ((x (n) - y (n-1))/slide)
  if(i<totalInputs){
    float prevVal = (float)inputValues[i];
    if(slide<1){
      slide=1;
    }
    if(val>255){
      val=255;
    }
    else if(val<0){
      val = 0;
    }
    float slideVal = prevVal + (((float)val-prevVal)/slide);
    int diff = abs((int)slideVal-inputValues[i]);
    if(diff>0){
      inputValues[i] = (int)slideVal;
      outburstCounter = 0;
    }
  }
}

void Patchbay::input(int i,int val){
  input(i,val,1);
}

void Patchbay::input(int val){
  input(0,val,1);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::setInputName(int i,char *tempName){
  if(i<totalInputs){
    inputNames[i] = tempName;
  }
}

void Patchbay::setInputName(char *tempName){
  inputNames[0] = tempName;
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::setOutputName(int i,char *tempName){
  if(i<totalOutputs){
    outputNames[i] = tempName;
  }
}

void Patchbay::setOutputName(char *tempName){
  outputNames[0] = tempName;
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::sendTest(){
  if(totalInputs>0){
    if(sendStamp+sendInterval<millis() && outburstCounter<outburstThresh){
      if(rf12_canSend()){
        sendValues();
        outburstCounter++;
        sendStamp = millis();
      }
    }
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::sendValues(){
  int len = totalInputs+2;
  byte msg[len];
  msg[0] = (byte)'v';
  msg[1] = (byte)totalInputs;
  // loop through each sensor values, appending it to the message
  for(int i=2;i<len;i++){
    msg[i] = (byte)inputValues[i-2];
  }
  // send the value over RF
  rf12_sendStart(0,msg, len);
  rf12_sendWait(0);
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

int Patchbay::output(int index){
  if(index<totalOutputs){
    return (int) outputValues[index];
  }
  else return 0;
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

int Patchbay::output(){
  return (int) outputValues[0];
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::receiveValues(){
  if (rf12_recvDone() && rf12_crc == 0) {
        
    int id = rf12_hdr;
    char type = (char)rf12_data[0];
    int len = (int)(byte)rf12_data[1];
    
    byte data[len];
    for(int i=0;i<len;i++){
      data[i] = (byte)rf12_data[i+2];
    }
                
    switch (type){
      case 'v':
        onValueEvent(id,len,data);
        break;
      case 'p':
        onPingEvent(id,len,data);
        break;
      case 'r':
        onRouterEvent(id,len,data);
        break;
      case 'i':
        initMetaMessages(id,len,data);
        break;
    }
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::onValueEvent(int tempID,int LEN,byte *data){
  if(totalOutputs>0){
    for(int i=0;i<LEN;i++){
      int outputIndex = (int)router[tempID][i];
      if(outputIndex!=99 && outputIndex<totalOutputs){
        outputValues[outputIndex] = data[i];
      }
    }
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::onRouterEvent(int senderID,int LEN,byte *data){
  if(LEN>=4){
    int receiverID = (int)data[0];
    if(receiverID==ID){  

      int routerID = (int)data[1];
      int inputIndex = (int)data[2];
      int val = (int) data[3];

      if(routerID<=routerIDs && inputIndex<routerDepth){
        router[routerID][inputIndex] = (byte)data[3];
        if(routerID==ID){
          router[0][inputIndex] = (byte)data[3]; // for the self Router
        }
        else if(routerID==0){
          router[ID][inputIndex] = (byte)data[3]; // for the self Router
        }

        // this is to reply the meta messages to include this one
        if(pongedRouterIDThing>=routerIDs){
          routerReply = true;
          routerReplyID = routerID;
          pongedCounter = 0; // restart the counter for outbursting pong meta messages
        }
        else{
          initMetaMessages(routerID); // if it's the routerID was too big, we restart the meta messages at that ID
        }
      }
      else{
        initMetaMessages(); // if it's the routerID was too big, we restart the meta messages
      }
    }
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::initMetaMessages(int senderID,int LEN,byte *data){
  if(LEN>0){
    int receiverID = (int)data[0];
    if(receiverID==ID){
      shouldPong = true;
      pongedRouterIDThing = 0;
      pongedCounter = 0;
    }
  }
}

void Patchbay::initMetaMessages(int tempID){
  shouldPong = true;
  pongedRouterIDThing = tempID;
  pongedCounter = 0;
}

void Patchbay::initMetaMessages(){
  shouldPong = true;
  pongedRouterIDThing = 0;
  pongedCounter = 0;
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::onPingEvent(int senderID,int LEN,byte *data){
  int sentID = (int) data[0];
  if(sentID==ID){
    pingStamp = millis();
    if(!serverConnection){
      initMetaMessages();
    }
    serverConnection = true;
    if(!routerReply){
      shouldPong = true;
    }
    // else{
    //   shouldPong = true;
    // }
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::pongServer(){
    
  // type, length, totalIns, totalOuts, NAME, ^ , portIndex,PORTNAME,^,routingRowID,routingRow
  int neededInfoBytes = 8;
  
  char* portName;

  if(pongedPort>=totalInputs){
    portName = outputNames[pongedPort-totalInputs];
  }
  else{
    portName = inputNames[pongedPort];
  }

  size_t portNameLength = strlen(portName);
  size_t nameLength = strlen(name);

  if(nameLength>10){
    nameLength = 10;
  }
  if(portNameLength>10){
    portNameLength = 10;
  }
  
  // this allows us to fit an entire routing row in the message
  
  // add up this packet's total byte length (minus type and length bytes
  int len = nameLength + portNameLength + neededInfoBytes + routerDepth;
  byte msg[len];
  
  // add the header info, and the total port amounts
  msg[0] = (byte)'o';
  msg[1] = (byte)(len-2); // +2 for the out & in lengths
  msg[2] = (byte)totalOutputs;
  msg[3] = (byte)totalInputs;
  
  // add the overall name of this project
  int counter = 4;
  for(int i=0;i<nameLength;i++){
    msg[counter] = (byte)name[i];
    counter++;
  }
  
  // then add the currently selected port's name
  msg[counter] = (byte)'^';
  counter++;
  msg[counter] = (byte)pongedPort;
  counter++;
  for(int i=0;i<portNameLength;i++){
    msg[counter] = (byte)portName[i];
    counter++;
  }
  msg[counter] = (byte)'^';
  counter++;
  msg[counter] = (byte)pongedRouterIDThing;
  counter++;
  for(int i=0;i<routerDepth;i++){
    msg[i+counter] = (byte)router[pongedRouterIDThing][i];
  }
      
  // send the value over RF
  rf12_sendStart(0,msg, len);
  rf12_sendWait(0);

  shouldPong = false;

  pongedPort++;
  if(pongedPort>=totalInputs+totalOutputs){
    pongedPort = 0;
  }
  pongedCounterThresh = 3;
  pongedCounter = (pongedCounter+1)%pongedCounterThresh;
  if(pongedCounter==0){
    pongedRouterIDThing = pongedRouterIDThing+1;
  }
}

void Patchbay::pongServer(int replyID){
    
  // type, length, totalIns, totalOuts, NAME, ^ , portIndex,PORTNAME,^,routingRowID,routingRow
  int neededInfoBytes = 8;
  
  char* portName;

  if(pongedPort>=totalInputs){
    portName = outputNames[pongedPort-totalInputs];
  }
  else{
    portName = inputNames[pongedPort];
  }

  size_t portNameLength = strlen(portName);
  size_t nameLength = strlen(name);

  if(nameLength>10){
    nameLength = 10;
  }
  if(portNameLength>10){
    portNameLength = 10;
  }
  
  // add up this packet's total byte length (minus type and length bytes
  int len = nameLength + portNameLength + neededInfoBytes + routerDepth;
  byte msg[len];
  
  // add the header info, and the total port amounts
  msg[0] = (byte)'o';
  msg[1] = (byte)(len-2); // +2 for the out & in lengths
  msg[2] = (byte)totalOutputs;
  msg[3] = (byte)totalInputs;
  
  // add the overall name of this project
  int counter = 4;
  for(int i=0;i<nameLength;i++){
    msg[counter] = (byte)name[i];
    counter++;
  }
  
  // then add the currently selected port's name
  msg[counter] = (byte)'^';
  counter++;
  msg[counter] = (byte)pongedPort;
  counter++;
  for(int i=0;i<portNameLength;i++){
    msg[counter] = (byte)portName[i];
    counter++;
  }
  msg[counter] = (byte)'^';
  counter++;
  msg[counter] = (byte)replyID;
  counter++;
  for(int i=0;i<routerDepth;i++){
    msg[i+counter] = (byte)router[replyID][i];
  }
      
  // send the value over RF
  rf12_sendStart(0,msg, len);
  rf12_sendWait(0);

  shouldPong = false;

  pongedPort = (pongedPort+1)%(totalInputs+totalOutputs);
  pongedCounterThresh = 6;
  pongedCounter = (pongedCounter+1)%pongedCounterThresh;
  if(pongedCounter==0){
    routerReply = false;
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::pokeServer(){

  int len = 3;
  
  byte msg[len];
  msg[0] = (byte)'x';
  msg[1] = (byte)1;
  msg[2] = (byte)'a'; // who cares...
  
  // send the value over RF
  rf12_sendStart(0,msg, len);
  rf12_sendWait(0);
  
  shouldPong = false;
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

void Patchbay::checkServer(){
  // check to see if we've gotting a ping event recently
  if(pingStamp+pingWaitTime<millis()){
    serverConnection = false; // if not, we're disconnected :(
    shouldPong = false;
    pongedRouterIDThing = 0;
  }

  if(shouldPong==true){
    if(pongedRouterIDThing>100){
      pongedRouterIDThing = 0;
    }
    if(pongedRouterIDThing<routerIDs && rf12_canSend()){
      pongServer();
    }
    else if(rf12_canSend()){
      pokeServer();
    }
  }

  else if(routerReply==true){
    // pong the router with only the ID of the routed index
    pongServer(routerReplyID);
  }
}

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////