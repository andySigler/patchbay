#PatchBay

##A Platform of Making Connections

(original version for my masters thesis is now kept [here](https://github.com/andysigler/patchbay-thesis-2014))

Patchbay is a wireless framework for simple communications between Arduino projects. It's currently built of an Arduino library, radio breakout board, and mobile interface.

The library currently depends on LowPowerLab's [RFm69 library](https://github.com/lowpowerlab/rfm69), and Adafruit's Bluefruit LE [firmware](https://github.com/adafruit/Adafruit_BluefruitLE_Firmware) and [library](https://github.com/adafruit/Adafruit_BluefruitLE_nRF51).

The HTML5 interface connects using Sandeep Mistry's [BLE node module](https://github.com/sandeepmistry/noble), but will soon move to mobile using Phonegap and Don Coleman's [BLE plugin](https://github.com/don/cordova-plugin-ble-central).