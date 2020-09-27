![Logo](admin/enocean.png)
# ioBroker.enocean

[![NPM version](http://img.shields.io/npm/v/iobroker.enocean.svg)](https://www.npmjs.com/package/iobroker.enocean)
[![Downloads](https://img.shields.io/npm/dm/iobroker.enocean.svg)](https://www.npmjs.com/package/iobroker.enocean)
![Number of Installations (latest)](http://iobroker.live/badges/enocean-installed.svg)
![Number of Installations (stable)](http://iobroker.live/badges/enocean-stable.svg)
[![Dependency Status](https://img.shields.io/david/jey-cee/iobroker.enocean.svg)](https://david-dm.org/jey-cee/iobroker.enocean)
[![Known Vulnerabilities](https://snyk.io/test/github/jey-cee/ioBroker.enocean/badge.svg)](https://snyk.io/test/github/jey-cee/ioBroker.enocean)

[![NPM](https://nodei.co/npm/iobroker.enocean.png?downloads=true)](https://nodei.co/npm/iobroker.enocean/)

**Tests:**: [![Travis-CI](http://img.shields.io/travis/jey-cee/ioBroker.enocean/master.svg)](https://travis-ci.org/jey-cee/ioBroker.enocean)

## enocean adapter for ioBroker

Connects EnOcean devices via USB/Serial devices with TCM300 Chips

## Supported Profiles

 [Here](https://github.com/jey-cee/ioBroker.enocean/SUPPORTED_PROFILES.md)

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
