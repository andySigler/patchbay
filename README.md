#PatchBay

##Tools for Designing the Internet of Useless Things

PatchBay is the outcome of my thesis at NYU's Interactive Telecommunications Program (ITP), during the Spring 2014 Semester. It is comprised of a Node.js server, accompanying HTML5 graphical interface, Arduino library for connecting devices, and Eagle designs for my board (based of the JeeNode).

For a more comprehensive description of the project and how the system works, please visit http://www.andysigler.com/patchbay.

###Installing the Arduino Library

If the Arduino IDE is open, close and quit.

Inside the "Arduino" folder, you'll find another folder title "Patchbay". Drag this folder into your Arduino IDE's library folder (by default on Mac it's in ~Documents/Arduino/libraries).

Open the Arduino IDE, go to File->Examples, and you should see PatchBay, along with some example sketches. These examples demonstrate sending and receiving simple values with you Arduino projects.

###NodeJS Server Installation

Download the repo, and cd into the folder "node", which contains the script and client-side code.

Install the required node-modules using:

```
npm install
```

If you have an RF12-enabled Arduino running the "PatchBay_Server_Sketch", connect that Arduino over usb to the computer running this node script.

Start the server with:

```
node app.js
```

You should see something printed out like:

```
http server started on port 8000
port open: yourArduinosSerialPort
```
