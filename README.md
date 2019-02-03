# Patchbay

## A Wireless Framework for Musical Instruments and Toys

[patchbay.io](http://patchbay.io)

This was built so that I could <b>very</b> easily create peer-to-peer connections between my physical computing projects, both old and new. The idea is to lower the barrier to entry for a project to become wireless and interoperable, using a wireless protocol inspired by MIDI, and device-specific Bluetooth LE profiles, auto-generated for each project.

Originally developed for my [ITP '14 masters thesis](https://github.com/andysigler/patchbay-thesis-2014), I have rebuilt it from the ground up during my residency at ITP this past year.

## Using Patchbay

#### Wiring

The Patchbay breakout board connects over hardware SPI, which are pins `D13`, `D12`, and `D11` on the Arduino Uno. The breakout also uses pins `D10`, `D9`, `D8`, `D7`, and `D2` for SPI handshaking with both radios, and one additional reset pin for the nRF51822.

On the Arduino Uno, this leaves digital pins `D0`, `D1`, `D3`, `D4`, `D5`, and `D6` available, as well as all Analog pins.

![Patchbay Wiring](/hardware/patchbay_wiring_new.jpg?raw=true "Patchbay Wiring")

#### Initialize

Include the Patchbay library in your Arduino sketch, and initialize it with the mesh ID, the name of your device, and the number of physical `inputs` and `outputs` you would like it to expose.

```arduino
#include <Patchbay.h>

#define ID 					1
#define total_inputs 		2
#define total_outputs 		1

Patchbay myPatch( ID , "Device-Name" , total_inputs , total_outputs );
```

All `inputs` and `outputs` are stored in two arrays for each type, and each is referenced through the API by their index. This means that if you have three `inputs`, the first has an identifier of `0`, the second `1`, and so on.

#### Setup

Once initialzed at the top of your sketch, simple call `.begin()` inside of the Arduino `setup()` function. This function will begin SPI communication with both radios, set your network ID, as well as setup your device's custom GATT profile.

```arduino
void setup(){
	myPatch.begin();
}
```

#### Naming an `input` or `output`

`inputs` and `outputs` can be assigned names to show up in the Patchbay interface. These are strings or char arrays of less than 20 characters. Names should be assigned once inside the Arduino `setup()` function.

```arduino
myPatch.inputName( 0 , "knob-1");
myPatch.inputName( 1 , "knob-2");

myPatch.outputName( 0 , "LED");
```

#### Update

Patchbay relies on very fast communication and update cycles with the breakout board. `.update()` handles all of this for you, checking for any BLE connections and updates, as well sending and receiving any necessary data over the RFm69.

Call `.update()` as often as possible. If your sketch uses any blocking functions, either try and avoid it, or call `.update()` multiple times inside your `loop()`.

```arduino
void loop(){
	myPatch.update();
}
```

`.update()` will also return a `boolean` for whether this devices' `outputs` have received a new value. If it returns `true`, your code should read the `output` values and handle them in whatever way your sketch needs to.

```arduino
void loop(){
	if(myPatch.update()) {
		// update your sketch as necessary
	}
}
```

#### Write to `inputs`

Patchbay `inputs` can be physical inputs like sensors, and must be represented as an integer between `0` and `255`.

```arduino
int knob_1_value = analogRead(0) / 4;			// map the value to 0-255
int knob_2_value = analogRead(1) / 4;
```

An `input` is then written to, and automatically sent out over any wireless links that might exist.

```arduino
myPatch.inputWrite( 0 , knob_1_value );			// set the values
myPatch.inputWrite( 1 , knob_2_value );

myPatch.update();								// send the values wireless
```

#### Read from `outputs`

Patchbay `outputs` can be physical outputs like lights or motors, and must be represented as an integer between `0` and `255`.

```arduino
int new_LED_value = myPatch.outputRead( 0 );	// get the value
```

When an `outputs` value has been updated, `.update()` will return true, allowing the sketch to update physical outputs only when necessary.

In addition, each `output` can be tested to see if it has changed or not with the `.outputChanged()` function. This is useful if your sketch has multiple `outputs`.

```arduino
if( myPatch.update() ) {						// update all radio communications

	for( int i=0; i<total_outputs; i++ ) {		// loop through all outputs

		if( myPatch.outputChanged( i ) ) {		// test to see if this one has changed

			Serial.print("Output ");			// use the new value
			Serial.print(i);
			Serial.print(" has changed to ");
			Serial.println( myPatch.outputRead(i) );
		}
	}
}
```

##Shoulders of Giants

I have developed Patchbay so far on my own in my free time, and none of this would have been possible without the wonderful open-source software and hardware from the following people.

The Arduino library currently depends on LowPowerLab's [RFm69 library](https://github.com/lowpowerlab/rfm69), and Adafruit's Bluefruit LE [firmware](https://github.com/adafruit/Adafruit_BluefruitLE_Firmware) and [library](https://github.com/adafruit/Adafruit_BluefruitLE_nRF51).

The HTML5 interface uses [hammer.js](http://hammerjs.github.io/) for touch events, and connects over BLE using Rand Dusing's [cordova plugin](https://github.com/randdusing/BluetoothLE), allowing the app to be available on iOS and Android.
