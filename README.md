#Patchbay

##A Wireless Framework for Musical Instruments and Toys

This was built so that I could <b>very</b> easily create peer-to-peer connections between my physical computing projects, both old and new. The idea is to lower the barrier to entry for a project to become wireless and interoperable, using a wireless protocol inspired by MIDI, and device-specific Bluetooth LE profiles, auto-generated for each project.

Originally developed for my [ITP '14 masters thesis](https://github.com/andysigler/patchbay-thesis-2014), I have rebuilt it from the ground up during my residency at ITP this past year.

##Using Patchbay

###Connection

The Patchbay breakout board connects over hardware SPI, which are pins `D13`, `D12`, and `D11` on the Arduino Uno. The breakout also uses pins `D10`, `D9`, `D8`, `D7`, and `D2` for SPI handshaking with both radios, and one additional reset pin for the nRF51822.

On the Arduino Uno, this leaves digital pins `D0`, `D1`, `D3`, `D4`, `D5`, and `D6` available, as well as all Analog pins.

###Initialize

Include the Patchbay library in your Arduino sketch, and initialize it with the mesh ID, the name of your device, and the number of physical `inputs` and `outputs` you would like it to expose.

```
#include <Patchbay.h>

#define ID 			1
#define INPUTS 		2
#define OUTPUTS 	1

Patchbay myPatch( ID , "Device-Name" , INPUTS , OUTPUTS);
```

All `inputs` and `outputs` are stored in two arrays for each type, and each is referenced through the API by their index. This means that if you have three `inputs`, the first has an identifier of `0`, the second `1`, and so on.

###Setup

Once initialzed at the top of your sketch, simple call `.setup()` inside of the Arduino `setup()` function. This function will begin SPI communication with both radios, set your network ID, as well as setup your device's custom GATT profile.

```
void setup(){
	myPatch.setup();
}
```

###Naming an `input` or `output`

`inputs` and `outputs` can be assigned names to show up in the Patchbay interface. These are strings or char arrays of less than 20 characters. Names should be assigned once inside the Arduino `setup()` function.

```
myPatch.inputName(0,"button-1");
myPatch.inputName(1,"button-2");

myPatch.outputName(0,"LED");
```

##Shoulders of Giants

I have developed Patchbay so far on my own in my free time, and none of this would have been possible without the wonderful open-source software and hardware from the following people.

The Arduino library currently depends on LowPowerLab's [RFm69 library](https://github.com/lowpowerlab/rfm69), and Adafruit's Bluefruit LE [firmware](https://github.com/adafruit/Adafruit_BluefruitLE_Firmware) and [library](https://github.com/adafruit/Adafruit_BluefruitLE_nRF51).

The HTML5 interface uses [hammer.js](http://hammerjs.github.io/) for touch events, and connects over BLE using Sandeep Mistry's [node module](https://github.com/sandeepmistry/noble). After further testing, it will move to a mobile app using Phonegap and Don Coleman's [BLE plugin](https://github.com/don/cordova-plugin-ble-central).