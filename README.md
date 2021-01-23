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
- Second EEP: Some devices use a second EEP, to add these create 
- Devices without possibility to teach-in to an other device (like Eltako Series 12 also known as Opus Green Net). 
They can be controlled with an virtual switch (F6-02-02): Open configuration and click add new device. 
Now choose EEP X1-01-01 and manufacturer ENOCEAN GMBH, as ID fffffff0. Count up the last sign, 1-9 and a-f, for each new virtual switch.
Click add device and close configuration. Then start teach-in on your device according to the manual, send command from virtual switch.
Now you should be able to control the device.
- Eltako series 14 (RS485):  Devices must already installed and setup. 
Then go to adapter config and add a new device with the ID of base plus device bus id (base ID ffe12340 + bus id 1 = ffe12341).
Then set the device in to learn mode (LRN) and set the channel number that is related to the bus id. 
Now go to the device objects and choose Teach-in at CMD. 
Repeat these steps for all channels.
- Eltako Tipp Funk: First create the device manual with the first EEP (see supported devices) and then with second EEP.
After you have created the device manual you have to click on Autodetect and bring your deviece in teachin mode.


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
//Temperature conversion from received data
 "+": [{
         "*": [
              { "-": [{"var": "value"}, 0] },
              0.2
            ]}, 0]

//This is a more complex looking formula.
//It is based on this one: Device Value = Multiplier * ( rawValue - Range min) + Scale min
//The Multiplier, in this case 0.2, is calculated in this way: (Scale max - Scale min) / (Range max - Range min)
```

***datafield -> value_out:*** This represents the value that will be sent to the device. This has only to be defined if a conversion is needed.

Example:

```
//Temperature conversion from ioBroker
 "*": [{
         "+": [
              { "-": [{"var": "value"}, 0] },
              0
            ]}, 0.2]

//This is a more complex looking formula.
//It is based on this one: Device Value = ( ( rawValue - Range min) + Scale min ) * Multiplier
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

## Device definition

The full implementation of a device consists minimum of two parts: A entry in 'lib/definitions/devices.json' and a EEP file, 
which defines the objects and how to handle the data telegram.
There are devices which uses more than one data telegram type to communicate, this means they have more EEP files.  
In special cases, as Eltako, there is also a manufacturer specific part in the 'packet_handler.js' defined.

```
"Model name or type" : {
      "EEP": [                    //The EEP(s) that will be used for this device. First one has to be the one that controlls the device.
        "TF-13-07",
        "TF-13-06"
      ],
      "autocreate": false,         //false if the device needs additional steps for teachin
      "teachin_method": "none",    //filter for automated teachin telegrams
      "id_offset": true,           //not all devices checks if the telegram whether it is for them
      "broadcast": false,          //true if the receiver id has to be ffffffff. This is used for virtual devices like a switch.
      "help": {                    //a step by step instruction how to add the device.
        "en": {
          "1": "Enter device ID.",
          "2": "Click on 'Add Device'."
        },
        "de": {
          "1": "Geräte ID eintragen.",
          "2": "Auf 'Gerät Hinzufügen' klicken."
        }
      }
    }
```

## Changelog

### 0.3.1
* added Eltako FABH65S, FBH65, FBH65S, FHF, FTR65DSB, FTR55DSB, FTR65HB, FTR55HB, FTR65SB, FTR55SB, FTRF65HB, FTRF65SB
* added Hoppe SecuSignal Window Handle 
* added Telefunken SES FS-EO
* updated: FTA65J teachin
* changed: FWS61 teachin
* fix TF-13-12 & TF-13-10 
* fixed TF-13-03
* use sender ID instead offset

### 0.3.0
* added Eltako devices: TF61D, TF100D, FTA65D, FTA55D, TF100L, TF100SSR, FTA65L, FTA55L, TF-1FT, TF-2FT, TF-2FT55, TF-2ZT, 
  TF-2ZT55, F4PT, F4PT55, TF-4FT, TF-4FT55, TF-8FM, FUD71, FSUD-230V, FSG71/1-10V, FDG71L, FKLD61, FLD61, FL62-230V, 
  FL62NP-230V, FR62-230V, FR62NP-230V FSR61NP-230V, TF-TA55D, TF-TA65D, TF-TA55J, TF-TA65J, TF-TA55L, TF-TA65L, FTK, 
  FTKB-RW, FFKB, FTKB-gr, FAH65S, FIH65S   
* re-add virtual switch with broadcast
* added possibility to use json logic for conditions
* added send converted value
* added value out to a5-20-01
* added double response for UTE 
* added send eltako teachin response twice
* added filter telegrams in addEltakoDevices
* update FSUD-230V teachin help
* update device list in config during teachin
* fix id offset for Eltako devices
* fix teachin for eltako devices when no offset in gateway is defined
* fix teachin for Eltako FTKB-hg
* fix manaual teachin devices
* fix correct formula in EEPs
* fix name of Eltako TF100L
* fix id offset for manual teachin

### 0.2.1
* fix for UTE teachin
* double response for UTE
* fix id offset for Eltako devices
* added Eltako devices: TF61D, TF100D, FTA65D, FTA55D, TF100L, TF100SSR, FTA65L, FTA55L, TF-1FT, TF-2FT, TF-2FT55, TF-2ZT, TF-2ZT55, F4PT, F4PT55, TF-4FT, TF-4FT55, TF-8FM, FUD71, FSUD-230V, FSG71/1-10V, FDG71L, FKLD61, FLD61
* update fsud-230v teachin help

### 0.2.0
* fix calculation for temperature in A5-02-13
* added Eltako FMMS44SB
* correct formula in readme
* add commands for D2-05-00
* json-logic-js security update
* change UI for add new devices
* teachin procedure revised

### 0.1.8
* added devices Eltako FUD61NPN-230V, FRW, TF61L-230V, FTKB
* fix teachin: was not set to false

### 0.1.7
* added profiles for Eltako F4HK14, FSB14, FUD14
* fix tf-14-01


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
