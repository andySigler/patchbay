/*
  Patchbay.h - Library for killin it.
  Created by Andy Sigler, March 20, 2014.
  Released into the public domain.
*/

#ifndef Patchbay_h
#define Patchbay_h

#include "Arduino.h"

class Patchbay
{
  public:

  	////////////////////////////////
	////////////////////////////////
	////////////////////////////////

	Patchbay();

    char* name;
	int ID;

	int totalOutputs;
	int outputValues[31];
	char* outputNames[31];

	int totalInputs;
	int inputValues[31];
	char* inputNames[31];

	////////////////////////////////
	////////////////////////////////
	////////////////////////////////

	void setup(char* _name,int ins,int outs);
	void update();
	void input(int i,int val,float slide);
	void input(int i,int val);
	void input(int val);
	void listenTo(int myOutput, int tempID, int theirInput);
	void setInputName(int i,char *name);
	void setInputName(char *name);
	void setOutputName(int i,char *name);
	void setOutputName(char *name);
	int output(int index);
	int output();

	////////////////////////////////
	////////////////////////////////
	////////////////////////////////

  private:

  	////////////////////////////////
	////////////////////////////////
	////////////////////////////////

	int sendInterval;
	unsigned long sendStamp;

	int outburstCounter;
	int outburstThresh;

	int routerIDs;
	int routerDepth;
	byte router[32][31];

	int pingWaitTime;
	unsigned long pingStamp;

	boolean serverConnection;
	boolean shouldPong;

	int pongedPort;
	int pongedRouterIDThing;
	int pongedCounter;
	int pongedCounterThresh;

	boolean routerReply;
	int routerReplyID;

  	////////////////////////////////
	////////////////////////////////
	////////////////////////////////

  	void selfRouter();
  	void sendTest();
	void sendValues();
	void receiveValues();
	void onValueEvent(int ID,int LEN,byte *data);
	void onRouterEvent(int ID,int LEN,byte *data);
	void initMetaMessages(int ID,int LEN,byte *data);
	void initMetaMessages(int tempID);
	void initMetaMessages();
	void onPingEvent(int ID,int LEN,byte *data);
	void pongServer();
	void pongServer(int replyID);
	void pokeServer();
	void checkServer();

	////////////////////////////////
	////////////////////////////////
	////////////////////////////////
};

#endif