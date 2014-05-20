#PatchBay

##Tools for Designing the Internet of Useless Things

PatchBay is the outcome of my thesis at NYU's Interactive Telecommunications Program (ITP), during the Spring 2014 Semester. It is comprised of a Node.js server, accompanying HTML5 graphical interface, Arduino library for connecting devices, and Eagle designs for my board (based off the JeeNode).

For a demo of the Patchbay's HTML5 interface, please visit http://www.andysigler.com/patchbay.

###Installing the Arduino Library

If the Arduino IDE is open, close and quit.

Inside the "Arduino" folder, you'll find another folder title "Patchbay". Drag this folder into your Arduino IDE's library folder (by default on Mac it's in ~Documents/Arduino/libraries).

Open the Arduino IDE, go to File->Examples, and you should see PatchBay, along with some example sketches. These examples demonstrate sending and receiving simple values with your Arduino projects.

The Patchbay currently requires the RFM12B to be connected. This means the Arduino's EEPROM memory must store three values, 1) it's ID, 2) it's Group, and 3) it's Frequency. For an explanation and instructions on how to set these, upload the sketch "Patchbay_Setup" from the example folder, and open the Serial Monitor at a baud rate of 57600.

###NodeJS Server Installation

The Patchbay is both an interface and a NodeJS server. The NodeJS server must run locally, in the room with the connected projects. In addition, an Arduino with the RFM12B must be connected over serial to the NodeJS server. This allows the server to communicate with all other projects (future implementations would ideally use Bluetooth 4.0 to bypass this translation).

Download the repo, and cd into the folder "node", which contains the script and client-side code.

Install the required node-modules using:

```
npm install
```

You must have an RF12-enabled Arduino running the "PatchBay_Server_Sketch" example code connected over usb to the computer running this node script.

Start the server with:

```
node app.js
```

You should see something printed out like:

```
http server started on port 8000
port open: yourArduinosSerialPort
```
