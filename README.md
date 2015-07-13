#Patchbay

##A Wireless Framework for Simple Connections

This was built so that I could <b>very</b> easily create peer-to-peer connections between my physical computing projects, both old and new. The idea is to lower the barrier to entry for a project to become wireless and interoperable, using a wireless protocol inspired by MIDI, and device-specific Bluetooth LE profiles, auto-generated for each project.

Originally developed for my [ITP '14 masters thesis](https://github.com/andysigler/patchbay-thesis-2014), I have rebuilt it from the ground up during my residency at ITP this past year.

The Arduino library currently depends on LowPowerLab's [RFm69 library](https://github.com/lowpowerlab/rfm69), and Adafruit's Bluefruit LE [firmware](https://github.com/adafruit/Adafruit_BluefruitLE_Firmware) and [library](https://github.com/adafruit/Adafruit_BluefruitLE_nRF51).

The HTML5 interface uses [hammer.js](http://hammerjs.github.io/) for touch events, and connects over BLE using Sandeep Mistry's [node module](https://github.com/sandeepmistry/noble). After further testing, it will move to a mobile app using Phonegap and Don Coleman's [BLE plugin](https://github.com/don/cordova-plugin-ble-central).