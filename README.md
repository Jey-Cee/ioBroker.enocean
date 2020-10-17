![Logo](admin/enocean.png)
# ioBroker.enocean

[![NPM version](http://img.shields.io/npm/v/iobroker.enocean.svg)](https://www.npmjs.com/package/iobroker.enocean)
[![Downloads](https://img.shields.io/npm/dm/iobroker.enocean.svg)](https://www.npmjs.com/package/iobroker.enocean)
![Number of Installations (latest)](http://iobroker.live/badges/enocean-installed.svg)
![Number of Installations (stable)](http://iobroker.live/badges/enocean-stable.svg)
[![Dependency Status](https://img.shields.io/david/jey-cee/iobroker.enocean.svg)](https://david-dm.org/jey-cee/iobroker.enocean)

[![NPM](https://nodei.co/npm/iobroker.enocean.png?downloads=true)](https://nodei.co/npm/iobroker.enocean/)

**Tests:**: [![Travis-CI](http://img.shields.io/travis/jey-cee/ioBroker.enocean/master.svg)](https://travis-ci.org/jey-cee/ioBroker.enocean)

## EnOcean adapter for ioBroker

Connects EnOcean devices via USB/Serial devices with TCM300 Chips

## Join the Discord server to discuss everything about ioBroker-enocean integration!

<a href="https://discord.gg/4EBGwBE"><img src="https://discordapp.com/api/guilds/743167951875604501/widget.png?style=banner2" width="25%"></a>

## [Sponsors](./SPONSORS.md)
If you like my work, please feel free to provide a personal donation  
(this is an personal Donate link for Jey Cee, no relation to the ioBroker Project !)  
[![Donate](https://raw.githubusercontent.com/iobroker-community-adapters/ioBroker.wled/master/admin/button.png)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=95YZN2LR59Q64&source=url)

## Control devices
In general there is a cmd object where you can choose the command that you want to execute. Before you can execute a command you have to set all attributes that are necessary, 
you can find this information in the profile definition.

Special:
* A5-20-01: Devices with this profile does only accept commands within 1 second after they have sent a message. They send periodically (10 minutes?), please read the manual.


## Teach-in
- Eltako series 14 (RS485):  Devices must already installed and setup. 
Then go to adapter config and add a new device with the ID of base plus device bus id (base ID ffe12340 + bus id 1 = ffe12341).
Then set the device in to learn mode (LRN) and set the channel number that is related to the bus id. 
Now go to the device objects and choose Teach-in at CMD. 
Repeat these steps for all channels.
- Second EEP: Some devices use a second EEP, to add these create 

## Teach-out (delete adapter binding from the device)
- Eltako Tipp-Funk: Send 3 times teach-in command during 2 seconds from ioBroker to device
- Devices with UTE: Start Teach-in for the adapter and follow the device instructions.
- RPS: Just delete the obejcts
- none: Just delete the objects

## Troubleshooting
- Device does not react to command: Open the device Object in the Object tab, go to native and look if there are more than one EEPs registered. 
If yes the first one has to be the one that will control the device. 

## Supported Teach-in procedures
- 4BS (Variation 1 & 2)
- UTE - Universal Uni- and Bidirectional Teach-in

## Supported Profiles

 Find a list [here](./SUPPORTED_PROFILES.md)
 
 ## Supported Devices
 
 Find a list [here](./SUPPORTED_DEVICES.md)

## Profile definition file

#### Data structure

***case:*** Could be a single element or an array, that holds a set of datafields. In case of an array the element is bound to an condition.

***send:*** true means this set of data is a command that will be sent to the device.

***condition:*** The condition which has to be true that this set of datafields is processesd. In the most cases the condition is a specific value from the data package.

***datafield:*** Information where in the data package the data are and how to handle the value. Also there is the object definiton for ioBroker.

***datafield -> secondArgument:*** Used to get a secondary infromation/value from the data package. Use case: Units can vary on their amount, so the device sends the unit as a seperate information. 
To change the unit inside ioBroker depending on the sent information, it is necessary to know this while processing the value.

***datafield -> condition:*** This could be a formula to convert a value. This is based on JSON-logic for detailed information
refer to  http://jsonlogic.com/operations.html. 

Example: 

```
//True or false
"==": [{"var": "value"}, 0]

//This will take the delivered value and check if it is equal to 0, if it is the state in iobroker will set to true.
```

***datafield -> value:*** This represents the value that is given back, except the condition is the output value. Than value should not be defined.

Example:

```
//Temperature conversion
 "*": [{
         "+": [
              { "-": [{"var": "value"}, 0] },
              0
            ]}, 0.2]

//This is a more complex looking formula.
//It is based on this one: Device Value = Multiplier * ( rawValue - Range min) + Scale min
//The Multiplier, in this case 0.2, is calculated in this way: (Scale max - Scale min) / (Range max - Range min)
```

***datafield -> decimals:*** Defines how many digits after decimal point will be shown. 

***datafield -> unit:*** Use this if the Unit is variable otherwise define it in iobroker.

Example:
```
//Choose between Watt(W) and Kilowatt(kW) depending on the unit information from the device
 "unit":{
            "if": [
              {"==":[{"var": "value2"}, 3]}, "W",
              {"==":[{"var": "value2"}, 4]}, "kW"
            ]
          }

//value2 comes from secondArgument. 
```

## Changelog

### 0.1.5
* added virtual switch
* rewrite A5-20-01
* fix profile A5-02-13

### 0.1.4
* added base id offset
* added new devices

### 0.1.3
* fix profile F6-10-00

### 0.1.2
* fix 4BS Teach-in
* added profile A510-20
* added profile TF14-02 relais contact
* fix profile D5-00-01
* fix profile A5-04-01
* fix profile TF-13-02

### 0.1.1
* fix Teach-in/out
* fix send data
* fix profile D2-05-00

### 0.1.0
* (Jey Cee) initial release

## License
MIT License

Copyright (c) 2020 Jey Cee <jey-cee@live.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
