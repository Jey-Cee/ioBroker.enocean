'use strict';

const RadioTelegram = require('./ESP3Packet').RadioTelegram;
const RadioTelegram_ERP2 = require('./ESP3Packet').RadioTelegram_ERP2;
const ResponseTelegram = require('./ESP3Packet').ResponseTelegram;
const MSCTelegram = require('./ESP3Packet').MSCTelegram;
const OneBSTeachIn = require('./ESP3Packet').OneBSTeachIn;
const FourBSTeachIn = require('./ESP3Packet').FourBSTeachIn;
const UTETeachIn = require('./ESP3Packet').UTETeachIn;
const EventTelegram = require('./ESP3Packet').EventTelegram;

const jsonLogic = require('json-logic-js');

const ByteArray = require('./byte_array');

const Enocean_manufacturer = require('../definitions/manufacturer_list.json');
const EEPList = require('../definitions/EEPinclude');
const eltakoDevices = require('../definitions/eltako').mscTelegrams;
const devices = require('../definitions/devices.json');
const objDef = require('../definitions/object_definitions').objDef;

const OneBS = 213;
const FourBS = 165;
const RPS = 246;
const UTE = 212;
const MSC = 209;
// const SmartACK = 198;
const VLD = 210;

class handleType1 {
	/**
	 * RADIO_ERP1
	 * @param {Object} that
	 * @param {Object} ESP3Packet
	 */
	constructor(that, ESP3Packet) {
		this.adapter = that;
		this.info = that.log.info;
		this.telegram = new RadioTelegram(ESP3Packet);
		this.senderID = this.telegram.senderID;
		// this.tType = this.telegram.type;
		this.repeaterCount = this.telegram.repeaterCount;
		this.rssi = ESP3Packet.optionalData['5'];


		//bind class functions to context of constructor
		this.main.bind(this);

		this.adapter.log.debug('Message for ID ' + this.senderID + ' has been received. It was repeated ' + this.repeaterCount + ' times.');

		this.main();

	}

	async main() {
		//get device object
		const dev = await this.adapter.getObjectAsync(this.adapter.namespace + '.' + this.senderID);
		if (dev !== null) {
			//set RSSI
			await this.adapter.setStateAsync(this.telegram.senderID + '.rssi', {val: - this.rssi, ack: true});
			//create object repeated for older adapter installation
			await this.adapter.setObjectNotExistsAsync(this.telegram.senderID + '.repeated', {
				type: 'state',
				common: {
					name: 'Count of repeated telegrams',
					role: 'indicator',
					type: 'number',
					read: true,
					write: false
				},
				native: {}
			});
			await this.adapter.setStateAsync(this.telegram.senderID + '.repeated', {val: parseInt(this.repeaterCount), ack: true});

			await processMessage(dev, this);
		}
	}

	async setState(deviceId, shortcut, value){
		await this.adapter.setStateAsync(this.adapter.namespace + '.' + deviceId + '.' + shortcut, {val: value, ack: true});
	}

	async extendObject(deviceId, shortcut, obj){
		await this.adapter.extendObjectAsync(this.adapter.namespace + '.' + deviceId + '.' + shortcut, obj);
	}

	/*logInfo(variable){
		const info = {};
		info.type = typeof variable;
		info.length = variable.length;
		if(typeof variable !== 'string' || typeof variable !== 'number'){
			info.value = JSON.stringify(variable);
		}
		info.value = variable;

		this.adapter.log.info(JSON.stringify(info));
	}*/
}

class handleType2{
	/**
	 * RESPONSE
	 * @param {Object} that
	 * @param {Object} ESP3Packet
	 */
	constructor(that, ESP3Packet) {
		this.adapter = that;
		this.info = that.log.info;
		this.telegram = new ResponseTelegram(ESP3Packet);
		this.senderID = this.telegram.senderID;
		// this.tType = this.telegram.type;
		// this.rssi = ESP3Packet.optionalData['5'];

		//bind class functions to context of constructor
		//this.main.bind(this);

		//this.main();
	}

	get main(){
		const returnCode = this.telegram.returnCode;
		const answer = {};
		switch (parseInt(returnCode.toString('hex'), 16)){
			case 0x00:
				answer.code = 'OK';
				break;
			case 0x01:
				answer.code = 'ERROR';
				break;
			case 0x02:
				answer.code = 'NOT SUPPORTED';
				break;
			case 0x03:
				answer.code = 'WRONG PARAMETER';
				break;
			case 0x04:
				answer.code = 'OPERATION DENIED';
				break;
			case 0x05:
				answer.code = 'DUTY CYCLE LOCK';
				break;
			case 0x06:
				answer.code = 'BUFFER TO SMALL';
				break;
			case 0x07:
				answer.code = 'NO FREE BUFFER';
				break;
		}
		if(this.telegram.dataLength > 1){
			answer.data = this.telegram.data.toString('hex');
		}

		if(this.telegram.optionalLength > 1){
			answer.optionalData = this.telegram.optionalData.toString('hex');
		}
		return answer;
	}
}

class handleType4{
	/**
	 * EVENT
	 * @param {Object} that
	 * @param {Object} esp3packet
	 * @param {Object} teachinInfo
	 */
	constructor(that, esp3packet, teachinInfo){
		this.adapter = that;
		this.sendData = that.sendData;
		this.log = that.log;
		this.debug = that.log.debug;
		this.info = that.log.info;
		// this.esp3packet = esp3packet;
		this.telegram = new EventTelegram(esp3packet);
		this.code = this.telegram.eventCode;
		this.data = this.telegram.eventData;
		this.teachinInfo = teachinInfo;

		this.main.bind(this);

		this.main();
	}

	async main(){
		switch(this.code){
			case '01':
				//SA_RECLAIM_NOT_SUCCESSFULL
				this.debug('Smart ACK reclaim was not successfully');
				break;
			case '02': {
				//SA_CONFIRM_LEARN
				const priority = this.data.slice(0, 1).toString('hex');
				// const mfrIdMSB = this.data.slice(1, 2).toString('hex');
				const mfrIdLSB = Enocean_manufacturer['0x0' + this.data.slice(2, 3).toString('hex')];
				const rorg = this.data.slice(3, 4).toString('hex');
				const func = this.data.slice(4, 5).toString('hex');
				const type = this.data.slice(5, 6).toString('hex');
				const rssi = this.data.slice(6, 7).toString('hex');
				const candidateId = this.data.slice(7, 11).toString('hex');
				const clientId = this.data.slice(11, 15).toString('hex');
				const hops = this.data.slice(15, 16).toString('hex');
				this.info(`Received Smart ACK learn confirmation: Priority ${priority}, ${mfrIdLSB}, ${rorg}-${func}-${type}, ${rssi} dBm, ${candidateId}, Candidate ID ${clientId}, Client ID ${clientId}, Hop Count ${hops}`);
				const data = Buffer.from([0x00, 0x00, 0x80, 0x00]);
				setTimeout( async () => {
					await this.sendData(this.adapter, data, null, 2);

					/*const readLernmode = Buffer.from([0x02]);
					await this.sendData(readLernmode, null, 6);*/
					await this.sendData(this.adapter, Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), null, 6);

					setTimeout( async () => {
						//await this.sendData(Buffer.from([0xd2, 0x00, 0x01, 0x9d, 0x45, 0x44]), null, 1);
					}, 21 * 1000);
				},100);
				new predefinedDeviceTeachIn(this.adapter, this.teachinInfo.name, this.teachinInfo.mfr, clientId);
				this.adapter.setState('gateway.teachin', {val: false, ack: true});
				break;
			}
			case '03':{
				//SA_LEARN_ACK
				const responseTime = ByteArray.from(this.data).getValue(7, 2).toString(16).toUpperCase();
				const confirmCode = ByteArray.from(this.data).getValue(9, 1);
				let confirm;
				switch(confirmCode){
					case 0x00:
						confirm = 'Learn in';
						break;
					case 0x11:
						confirm = 'Discard Learn IN, EEP not accepted';
						break;
					case 0x12:
						confirm = 'Discard Learn IN, PM has no place for further MB';
						break;
					case 0x13:
						confirm = 'Discard Learn IN, Controller has no place for new sensor';
						break;
					case 0x14:
						confirm = 'Discard Learn IN, RSSI was not good enough';
						break;
					case 0x20:
						confirm = 'Learn OUT';
						break;
				}
				this.info(`Received Smart ACK learn result: Response Time ${responseTime}, ${confirm}`);
				break;
			}
			case '04': {
				//CO_READY
				const wCause = ByteArray.from(this.data).getValue(7, 1);
				const mode = this.telegram.optionalData;
				let wakeup;
				switch (wCause){
					case 0x00:
						wakeup = 'Voltage supply drop or indicates that VDD > VON';
						break;
					case 0x01:
						wakeup = 'Reset caused by usage of the reset pin (is set also after downloading the program with the programmer)';
						break;
					case 0x02:
						wakeup = 'Watchdog timer counter reached the timer period';
						break;
					case 0x03:
						wakeup = 'Flywheel timer counter reached the timer period';
						break;
					case 0x04:
						wakeup = 'Parity error';
						break;
					case 0x05:
						wakeup = 'HW Parity error in the Internal or External Memory';
						break;
					case 0x06:
						wakeup = 'A memory request from the CPU core does not correspond to any valid memory location. This error may be caused by a S/W malfunction.';
						break;
					case 0x07:
						wakeup = 'Wake-up pin 0 activated';
						break;
					case 0x08:
						wakeup = 'Wake-up pin 1 activated';
						break;
					case 0x09:
						wakeup = 'Unknown reset source – reset reason could not be detected';
						break;
					case 0x10:
						wakeup = 'UART Wake up';
						break;
				}
				let security = '';
				if(mode === 0x00){
					security = 'Standard Security';
				}else if(mode === 0x01){
					security = 'Extended Security';
				}
				this.info(`Event ready received: Wakeup reason ${wakeup}, ${security}`);
				break;
			}
			case '05': {
				//CO_EVENT_SECUREDEVICES
				const cause = ByteArray.from(this.data).getValue(7, 1);
				const deviceId = ByteArray.from(this.data).getValue(8, 4).toString(16).toUpperCase();
				let eCause = '';
				switch (cause) {
					case 0x00:
						eCause = 'Teach-in failed because no more space available in secure link table.';
						break;
					case 0x01:
						eCause = 'Reserved';
						break;
					case 0x02:
						eCause = 'Resynchronization attempt with wrong private key.';
						break;
					case 0x03:
						eCause = 'Configured count of telegrams with wrong CMAC received.';
						break;
					case 0x04:
						eCause = 'Teach-In failed. Telegram corrupted.';
						break;
					case 0x05:
						eCause = 'PSK Teach-In failed. No PSK is set for the device.';
						break;
					case 0x06:
						eCause = 'Teach-In failed. Trying to teach-in without Pre-Shared Key even if the PSK is set for the device.';
						break;
					case 0x07:
						eCause = 'CMAC or RLC not correct';
						break;
					case 0x08:
						eCause = 'Standard Telegram from device in secure link table.';
						break;
					case 0x09:
						eCause = 'Teach-In successful.';
						break;
					case 0x0A:
						eCause = 'Received valid RLC sync via Teach-In';
						break;
				}
				this.info(`Event securedevices received: ${deviceId}, ${eCause}`);
				break;
			}
			case '06': {
				//CO_DUTYCYCLE_LIMIT
				const cause = ByteArray.from(this.data).getValue(7, 1);
				if(cause === 0x00){
					this.info('Duty cycle limit not yet reached. It is possible to send telegrams');
				}else if(cause === 0x01){
					this.adapter.log.warn('Duty cycle limit reached. It is not possible to send telegrams');
				}
				break;
			}
			case '07': {
				//CO_TRANSMIT_FAILED
				const cause = ByteArray.from(this.data).getValue(7, 1);
				if(cause === 0x00){
					this.adapter.log.warn('CSMA failed, channel not free');
				}else if(cause === 0x01){
					this.adapter.log.warn('No Acknowledge received, telegram was transmitted, but no ack received.');
				}
				break;
			}
			case '08':
				//CO _TX_DONE
				this.debug('All transmissions finished.');
				break;
			case '09':
				//CO_LRN_MODE_DISABLED
				this.info('Teach-in mode disabled.');
				break;
		}
	}
}

class handleType10{
	/**
	 * RADIO_ERP2
	 * @param {Object} that
	 * @param {Object} esp3packet
	 */
	constructor(that, esp3packet){
		this.adapter = that;
		this.sendData = that.sendData;
		this.log = that.log;
		this.debug = that.log.debug;
		this.info = that.log.info;
		this.telegram = new RadioTelegram_ERP2(esp3packet);
		this.senderID = this.telegram.senderID;

		this.main.bind(this);

		this.main();
	}

	async main() {
		if(!this.telegram.senderID) {
			return;
		}

		const dev = await this.adapter.getObjectAsync(this.telegram.senderID);
		if (dev !== null) {
			//create object repeated for older adapter installation
			await this.adapter.setObjectNotExistsAsync(this.telegram.senderID + '.repeated', {
				type: 'state',
				common: {
					name: 'Count of repeated telegrams',
					role: 'indicator',
					type: 'number',
					read: true,
					write: false
				},
				native: {}
			});
			await this.adapter.setStateAsync(this.telegram.senderID + '.repeated', {val: parseInt(this.telegram.repeaterCount), ack: true});

			this.adapter.log.debug('Message for ID ' + this.telegram.senderID + ' has been received. It was repeated ' + this.telegram.repeaterCount + ' times.');

			await processMessage(dev, this);
		}

	}

	async setState(deviceId, shortcut, value){
		await this.adapter.setStateAsync(this.adapter.namespace + '.' + deviceId + '.' + shortcut, {val: value, ack: true});
	}

	async extendObject(deviceId, shortcut, obj){
		await this.adapter.extendObjectAsync(this.adapter.namespace + '.' + deviceId + '.' + shortcut, obj);
	}

	/*logInfo(variable){
		const info = {};
		info.type = typeof variable;
		info.length = variable.length;
		if(typeof variable !== 'string' || typeof variable !== 'number'){
			info.value = JSON.stringify(variable);
		}
		info.value = variable;

		this.adapter.log.info(JSON.stringify(info));
	}*/
}

class handleTeachIn{
	/**
	 *
	 * @param {Object} that
	 * @param {Object} ESP3Packet
	 * @param {Object} teachinInfo
	 */
	constructor(that, ESP3Packet, teachinInfo = null) {
		this.adapter = that;
		this.sendData = that.sendData;
		this.log = that.log;
		this.ESP3Packet = ESP3Packet;
		this.info = teachinInfo;

		this.main.bind(this);

		this.main();
	}

	async main() {
		if(this.adapter.config.gateway === 'fgw14-usb'){
			this.telegram = new RadioTelegram_ERP2(this.ESP3Packet);
		} else {
			this.telegram = new RadioTelegram(this.ESP3Packet);
		}
		this.senderID = this.telegram.senderID;
		this.tType = this.telegram.type;
		if(this.info) this.tType = this.info.teachinMethod;

		this.adapter.log.debug(`teachinMethod: ${this.tType} from ID "${this.senderID}"`);

		switch(this.tType) {
			case 'A5':
			case '4BS':
			case FourBS:
			{
				const teachinData = new FourBSTeachIn(this.telegram.userData);
				if (teachinData.teachIn === 0) {
					const FUNC = await addLeadingZero(teachinData.EEPFunc.toString(16));
					const TYPE = await addLeadingZero(teachinData.EEPType.toString(16));
					const MANUFACTURER = Enocean_manufacturer['0x0' + await addLeadingZero( teachinData.mfrID.toString(16)) ];

					const gateway = await this.adapter.getObjectAsync('gateway');
					const baseID = ByteArray.from( gateway.native.BaseID.match(/.{1,2}/g) );

					//Teach-In variations (LRNtype): 0 = without EEP and Manufacturer ID, 1 = with EEP and Manufacturer ID
					if (teachinData.LRNtype === 1 && teachinData.LRNStatus === 0) {
						const type = [0xA5];
						const subTelNum = [0x00];
						const tempId = this.senderID.toUpperCase().match(/.{1,2}/g);
						const receiverID = [];
						for(const b in tempId){
							// receiverID.push('0x' + tempId[b]);
							receiverID.push(parseInt(tempId[b], 16));
						}

						const optionalData = subTelNum.concat(receiverID, [0xFF, 0x00]);
						const data = ByteArray.from();
						data.setValue(parseInt(FUNC, 16), 0, 6);	//FUNC
						data.setValue(parseInt(TYPE, 16), 6, 7);	//TYPE
						data.setValue(2047, 13, 11);	//Manufacturer ID
						data.setValue(1, 24, 1);	//LRN Type
						data.setValue(1, 25, 1);	//EEP Result
						data.setValue(1, 26, 1);	//LRN Result
						data.setValue(1, 27, 1);	//LRN Status
						data.setValue(0, 28, 1);	//LRN Bit
						const finalData = type.concat(data, baseID, 0x00);
						await this.sendData(this.adapter, finalData, optionalData, 0x01);

						this.adapter.log.info(`EEP A5-${FUNC}-${TYPE} detected for device with ID ${this.senderID}, manufacturer: ${MANUFACTURER}`);
						new predefinedDeviceTeachIn(this.adapter, this.info.name, this.info.mfr, this.senderID);
						//await createObjects(this, `A5-${FUNC}-${TYPE}`, MANUFACTURER);
						this.adapter.setState('gateway.teachin', {val: false, ack: true});
					} else if (teachinData.LRNtype === 0) {
						const lrnStatus = ByteArray.from(this.telegram.userData).getValue(27, 1);
						const lrnResult = ByteArray.from(this.telegram.userData).getValue(26, 1);
						const eepResult = ByteArray.from(this.telegram.userData).getValue(25, 1);
						this.adapter.log.debug(`LRN Status: ${lrnStatus}, LRN Result: ${lrnResult}, EEP Result: ${eepResult} The ID is "${this.senderID}"`);
						this.adapter.log.info(`Teach-In: 4BS (A5) Telegram without EEP and manufacturer ID detected, you have to add this device manually. The ID is "${this.senderID}"`);
						this.adapter.setState('gateway.teachin', {val: false, ack: true});
					} else if (teachinData.LRNStatus === 0) {
						const type = [0xA5];
						const subTelNum = [0x00];
						const tempId = this.senderID.toUpperCase().match(/.{1,2}/g);
						const receiverID = [];
						for(const b in tempId){
							//receiverID.push('0x' + tempId[b]);
							receiverID.push(parseInt(tempId[b], 16));
						}
						const optionalData = subTelNum.concat(receiverID, [0xFF, 0x00]);
						const data = ByteArray.from([0x00, 0x00, 0x00, 0x00]);
						data.setValue(1, 24, 1);	//LRN Type
						data.setValue(1, 25, 1);	//EEP Result
						data.setValue(1, 26, 1);	//LRN Result
						data.setValue(1, 27, 1);	//LRN Status
						data.setValue(0, 28, 1);	//LRN Bit
						const finalData = type.concat(data, baseID, 0x00);
						await this.sendData(this.adapter , finalData, optionalData, 0x01);
						this.adapter.setState('gateway.teachin', {val: false, ack: true});
					}
				}
				break;
			}
			case 'F6':
			case 'RPS':
			case RPS: {
				new predefinedDeviceTeachIn(this.adapter, this.info.name, this.info.mfr, this.senderID);
				this.adapter.setState('gateway.teachin', {val: false, ack: true});
				break;
			}
			case 'D4':
			case 'UTE':
			case UTE: {
				//this.adapter.log.info(`Teach-In: UTE (D4) Telegram detected, you have to add this device manually. The ID is "${this.senderID}"`);
				const teachinData = new UTETeachIn(this.telegram.userData);
				const mfr8LSB = await addLeadingZero( teachinData.IDLSB );
				const mfr3MSB = await addLeadingZero( teachinData.IDMSB );
				const TYPE = await addLeadingZero( teachinData.EEPType );
				const FUNC = await addLeadingZero( teachinData.EEPFunc );
				const RORG = await addLeadingZero( teachinData.EEPRorg );
				const channels = await addLeadingZero( teachinData.channels );

				const gateway = await this.adapter.getObjectAsync('gateway');
				const baseID = ByteArray.from( gateway.native.BaseID.match(/.{1,2}/g) );

				const obj = await this.adapter.getObjectAsync(this.senderID);
				if (obj && (teachinData.request === 2 || teachinData.request === 1)) { //Teach-out
					const type = [0xD4];
					const subTelNum = [0x01];
					const tempId = this.senderID.toUpperCase().match(/.{1,2}/g); //device address who will receive the response
					const receiverID = []; //tempId has to be split into array for usage

					for (const b in tempId) {
						receiverID.push('0x' + tempId[b]);
					}

					// @ts-ignore
					const optionalData = subTelNum.concat(receiverID, [0xFF, 0x00]); //building optional data array

					const data = ByteArray.from([0x00, channels, mfr8LSB, 0x00, TYPE, FUNC, RORG ]); //initialize data array//initialize data array
					data.setValue(teachinData.communication, 0, 1);	//Communication type Uni-/Bi-directional (0/1)
					data.setValue(2, 2, 2);	//Request type
					data.setValue(1, 4, 4);	//Command identifier
					data.setValue(parseInt(mfr3MSB), 29, 3);	//Manufacturer-ID (3 MSB)
					const finalData = type.concat(data, baseID, 0x00);

					await this.sendData(this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
					await this.sendData(this.adapter, finalData, optionalData, 0x01);
					await deleteDevice(this, this.senderID);
					this.adapter.setState('gateway.teachin', {val: false, ack: true});

				} else if ( (teachinData.request === 2 || teachinData.request === 0) && teachinData.response === 0 && (teachinData.communication === 1 || teachinData.communication === 0) ) { 	//Bidirectional Teach-in/-out request with response
					const type = [0xD4];
					const subTelNum = [0x01];
					const tempId = this.senderID.toUpperCase().match(/.{1,2}/g); //device address who will receive the response
					const receiverID = []; //tempId has to be split into array for usage

					for (const b in tempId) {
						// receiverID.push('0x' + tempId[b]);
						receiverID.push(parseInt(tempId[b], 16));
					}


					const optionalData = subTelNum.concat(receiverID, [0xFF, 0x00]); //building optional data array

					const data = ByteArray.from([0x00, channels, mfr8LSB, 0x00, TYPE, FUNC, RORG ]); //initialize data array
					data.setValue(teachinData.communication, 0, 1);	//Communication type Uni-/Bi-directional (0/1)
					data.setValue(1, 2, 2);	//Request type
					data.setValue(1, 4, 4);	//Command identifier
					data.setValue(parseInt(mfr3MSB), 29, 3);	//Manufacturer-ID (3 MSB)
					const finalData = type.concat(data, baseID, [0x00]);

					await this.sendData(this.adapter, finalData,  optionalData, 0x01); //0x01 = Packet Type ERP1
					await this.sendData(this.adapter, finalData, optionalData, 0x01);
					await createObjects(this, `${RORG}-${FUNC}-${TYPE}`, Enocean_manufacturer[`0x0${mfr8LSB}`]);
					this.adapter.setState('gateway.teachin', {val: false, ack: true});
				} else if ( (teachinData.request === 2 || teachinData.request === 0) && teachinData.response === 1 && (teachinData.communication === 1 || teachinData.communication === 0) ) { //Bidirectional Teach-in/-out request without response
					await createObjects(this, `${RORG}-${FUNC}-${TYPE}`, Enocean_manufacturer[`0x0${mfr8LSB}`]);
					this.adapter.setState('gateway.teachin', {val: false, ack: true});
				}

				//this.adapter.log.info(`Universal Teach-in: Communication: ${teachinData.communication}, Teach-In-Response: ${teachinData.response}, Teach-in-Request: ${teachinData.request}, Command: ${teachinData.cmd}, Channels: ${teachinData.channels}, MFR8LSB: ${mfr8LSB.toString(16)}, MFR3MSB: ${mfr3MSB.toString(16)}, RORG: ${RORG.toString(16)}, FUNC: ${FUNC.toString(16)}, TYPE: ${TYPE.toString(16)}`);
				break;
			}
			case 'D5':
			case OneBS: {
				const teachinData1BS = new OneBSTeachIn(this.telegram.userData);

				if (teachinData1BS.teachIn === 0) {
					this.adapter.log.info(`Teach-In: 1BS (D5) Telegram detected, you have to add this device manually. The ID is "${this.senderID}"`);
					this.adapter.setState('gateway.teachin', {val: false, ack: true});
				}
				break;
			}
			case 'D2':
			case VLD:
				this.adapter.log.info(`Teach-In: VLD (D2) Telegram detected, you have to add this device manually. The ID is "${this.senderID}"`);
				this.adapter.setState('gateway.teachin', {val: false, ack: true});
				break;
			case 'D1':
			case 'MSC':
			case MSC: {
				const teachinData = new MSCTelegram(this.telegram.userData);
				const mfr = teachinData.mfrID;

				const gateway = await this.adapter.getObjectAsync('gateway');
				const baseID = gateway.native.BaseID;
				const offset = gateway.native.BaseID_offset;

				if (mfr === 'D') {  //check if manufacturer is Eltako
					await addEltakoDevice(this, baseID, offset);
				} else {
					this.adapter.log.info(`Teach-In: MSC (D1) Telegram detected, you have to add this device manually. The ID is "${this.senderID}" and the manufacturer is ${Enocean_manufacturer['0x0' + mfr]}`);
					this.adapter.setState('gateway.teachin', {val: false, ack: true});
				}
				break;
			}
			case 'D0':{
				break;
			}
		}
	}

}

class manualTeachIn {
	/**
	 *
	 * @param {object} that
	 * @param {string} eep
	 * @param {string} mfr
	 * @param {string} id
	 * @param {string} name
	 * @param {string} baseIDoffset
	 * @param {string} broadcast
	 */
	constructor(that, eep, mfr, id, name, baseIDoffset, broadcast){
		this.adapter = that;
		this.eep = eep;
		this.mfr = mfr;
		this.senderID = id;
		this.name = name;
		this.IDoffset = baseIDoffset;
		this.broadcast = broadcast;

		this.main.bind(this);

		this.main();

	}

	async main(){
		await createObjects(this, this.eep, this.mfr);
	}

}

class predefinedDeviceTeachIn {
	/**
	 *
	 * @param {object} that
	 * @param {string} device
	 * @param {string} mfr
	 * @param {string} id
	 */
	constructor(that, device, mfr, id){
		this.adapter = that;
		this.device = device;
		this.mfr = mfr;
		this.senderID = id;

		this.main.bind(this);

		this.main();

	}

	async main(){
		const device = devices[this.mfr][this.device];

		this.name = this.device;
		this.IDoffset = device.id_offset;
		this.broadcast = device.broadcast;

		for (const i in device.EEP){
			await createObjects(this, device.EEP[i], this.mfr);
		}

		if(device.EEP.length > 0){
			await this.adapter.extendObjectAsync(this.senderID.toLowerCase(), {
				'native': {
					eep: device.EEP
				}
			});
		}

	}

}

/**
 *
 * @param {object} _this
 * @param {string} eep
 * @param {string} mfr
 * @returns {Promise<void>}
 */
async function createObjects(_this, eep, mfr){

	eep = eep.toUpperCase();
	_this.adapter.log.info(`Create objects for ${eep} from ${mfr} with id: ${_this.senderID}`);
	if(mfr === null){
		mfr = 'EnOcean GmbH';
	}
	const alias = eep.replace(/-/g, '');
	//Check if profile exists is not abort createObjects
	if(alias === undefined){
		return;
	}

	if (!EEPList[alias]) {
		_this.adapter.log.info(`EEP ${eep} unknown, send this information to developer.`);
		return;
	}
	const obj = await _this.adapter.getObjectAsync(_this.senderID);
	const id = _this.senderID.toLowerCase();

	if (!obj) {
		const deviceObj = {
			type: 'device',
			common: {
				name: _this.name ? _this.name : EEPList[alias].type_title
			},
			native: {
				id: id,
				eep: [
					eep
				],
				manufacturer: mfr
			}
		};

		if (_this.IDoffset) {
			const gateway = await _this.adapter.getObjectAsync('gateway');
			const senderIDs = gateway.native.senderIDs;

			let exists = true;
			let nextEmptyId = null;
			//go through all IDs in index
			for(const s in senderIDs){
				//check if the Device ID is already in the index, stop for loop if yes
				if(senderIDs[s] === id){
					deviceObj.native.Sender_ID = s;
					exists = true;
					break;
				} else if(senderIDs[s] === '' && nextEmptyId === null){
					nextEmptyId = s;
				} else {
					exists = false;
				}
			}

			if(exists === false) {
				deviceObj.native.Sender_ID = nextEmptyId;
				// @ts-ignore
				senderIDs[nextEmptyId] = id;
			}

			//leave offset for compability reasons with versions lower 0.3.x
			let offset;
			if(gateway.native.BaseID_offset >= 0){
				offset = gateway.native.BaseID_offset + 1;
				await _this.adapter.extendObjectAsync('gateway', {
					'native': {
						'BaseID_offset': offset,
						'senderIDs': senderIDs
					}
				});
			}else{
				await _this.adapter.extendObjectAsync('gateway', {
					'native': {
						'BaseID_offset': 0,
						'senderIDs': senderIDs
					}
				});
			}
			deviceObj.native.baseIDoffset = offset;
		}

		await _this.adapter.setObjectNotExistsAsync(id, deviceObj);

		if (_this.broadcast) {
			await _this.adapter.extendObjectAsync(id.toLowerCase(), {
				'native': {
					'broadcast': true
				}
			});
		}

		await _this.adapter.setObjectNotExistsAsync(id + '.rssi', {
			type: 'state',
			common: {
				name: 'Signal Strength',
				role: 'value.rssi',
				type: 'number',
				read: true,
				write: false,
				unit: 'dBm'
			},
			native: {}
		});

		await _this.adapter.setObjectNotExistsAsync(id + '.repeated', {
			type: 'state',
			common: {
				name: 'Count of repeated telegrams',
				role: 'indicator',
				type: 'number',
				read: true,
				write: false
			},
			native: {}
		});

	} else {
		const newEEP = obj.native.eep;
		let exists = false;
		for (const e in newEEP) {
			if (newEEP[e] === eep) {
				exists = true;
			}
		}
		if (!exists) {
			newEEP.push(eep);
			await _this.adapter.extendObjectAsync(id.toLowerCase(), {
				native: {
					eep: newEEP
				}
			});
		}

	}

	let preDefinedObjects = [];
	if(EEPList[alias].objects.preDefined) { preDefinedObjects = EEPList[alias].objects.preDefined; }

	for(const p in preDefinedObjects) {
		await _this.adapter.extendObjectAsync(`${id}.${preDefinedObjects[p]}`, objDef[preDefinedObjects[p]]);
	}

	for(const o in EEPList[alias].objects) {
		if(o !== 'preDefined'){
			await _this.adapter.extendObjectAsync(`${id}.${o}`, EEPList[alias].objects[o]);
		}
	}
}

/**
 * Invert bit string (normal used for msb)
 * @param {number} bitString
 * @returns {Promise<string>}
 */
async function invertBitString(bitString){
	return bitString.toString(2).split('').reverse().join('');
}

/**
 *
 * @param {string} data
 */
async function addLeadingZero(data) {
	if (data.length === 1) {
		return data.padStart(2, '0');
	} else {
		return data;
	}
}

/**
 * get Value from data telegram
 * @param {any} telegram
 * @param {object} data - datafield description from EEP file
 * @returns {Promise<{val: (Promise<{val: *, shortcut: *}>|number|string), shortcut}>}
 */
async function getValue(telegram, data){
	const shortcut = data.shortcut ? data.shortcut : '';
	const bitoffs = parseInt(data.bitoffs);
	const bitsize = parseInt(data.bitsize);
	const value = ByteArray.from(telegram).getValue(bitoffs, bitsize);
	return {shortcut: shortcut, val: value};
}

async function convertValue(datafield, value, that) {
	/**
	 * @type {boolean|number|string|null}
	 */
	let test = false;
	let condition = false;
	let unit = null;
	let secondArg;	//if secondArgument is given this will be filled with this value that comes from other datafield

	if(datafield.bitType && datafield.bitType === 'MSB'){
		value = await invertBitString(value);
	}
	if (datafield.secondArgument && !datafield.secondArgument.bitType) {
		secondArg = await getValue(that.telegram.userData, datafield.secondArgument);
		test = jsonLogic.apply(datafield.condition, {'value': value, 'value2': secondArg.val});
		if (test === false) {
			test = null;
		} else {
			condition = true;
		}
	}else if(datafield.secondArgument && datafield.secondArgument.bitType === 'MSB'){
		secondArg = await getValue(that.telegram.userData, datafield.secondArgument);
		// @ts-ignore
		test = await invertBitString(secondArg.val);
	}else if (datafield.condition) {
		test = jsonLogic.apply(datafield.condition, {'value': value});
	}

	if(test !== null && datafield.value){
		test = jsonLogic.apply(datafield.value, {'value': value});
	}

	if(datafield.secondArgument && test === null && datafield.value && condition === true){
		secondArg = await getValue(that.telegram.userData, datafield.secondArgument);
		test = jsonLogic.apply(datafield.value, {'value': value, 'value2': secondArg.val});
	}

	if(typeof test === 'number' && datafield.decimals){
		const num = Number(test);
		test = parseFloat(num.toFixed(datafield.decimals));
	}

	if(datafield.unit && secondArg !== undefined){
		unit = jsonLogic.apply(datafield.unit, {'value2': secondArg.val});
	}

	return {newVal: test, unit: unit};
}

async function processMessage(dev, that) {
	const eep = dev.native.eep;
	const rorg = that.telegram.type.toString(16).toUpperCase();

	for (const e in eep) {

		const eep1 = eep[e].replace(/-/g, '');
		const profile = EEPList[eep1];
		const rorgIn = profile.rorg_number.replace('0x', '');

		if (rorg === rorgIn) {
			for (const c in profile.case) {

				//Check if there are conditions to choose the right data handling
				//conditions are optional
				let conditionResult = null;
				if (profile.case[c].condition !== undefined) {

					for (const s in profile.case[c].condition) {
						const keys = Object.keys(profile.case[c].condition);
						if (keys[0] === 'statusfield') {  //statusfield has to be defined as the first condition
							const condition = profile.case[c].condition[s];

							if (condition.length !== undefined) {
								for (const con in profile.case[c].condition[s]) {
									const check = profile.case[c].condition[s][con];
									const bitoffs = parseInt(check.bitoffs);
									const bitsize = parseInt(check.bitsize);
									const value = ByteArray.from(that.telegram.status).getValue(bitoffs, bitsize);
									if (value === parseInt(check.value) && conditionResult !== false) {
										conditionResult = true;
									} else {
										conditionResult = false;
									}

								}
							}
						} else {
							const condition = profile.case[c].condition[s];
							if (condition.length !== undefined) {
								for (const con in profile.case[c].condition[s]) {
									const check = profile.case[c].condition[s][con];
									const bitoffs = parseInt(check.bitoffs);
									const bitsize = parseInt(check.bitsize);
									const value = ByteArray.from(that.telegram.userData).getValue(bitoffs, bitsize);
									const testResult = jsonLogic.apply(check.value, {'value': value});
									if (testResult === true || value === parseInt(check.value) && (conditionResult !== false || conditionResult === null)) {
										conditionResult = true;
									} else {
										conditionResult = false;
									}
								}
							} else {
								const check = profile.case[c].condition[s];
								const bitoffs = parseInt(check.bitoffs);
								const bitsize = parseInt(check.bitsize);
								const value = ByteArray.from(that.telegram.userData).getValue(bitoffs, bitsize);
								const testResult = jsonLogic.apply(check.value, {'value': value});
								if (testResult === true || value === parseInt(check.value) && (conditionResult !== false || conditionResult === null)) {
									conditionResult = true;
								} else {
									conditionResult = false;
								}
							}
						}

					}

				}
				//look for data and decode them
				if (conditionResult === true || conditionResult === null) {
					if (profile.case[c].datafield !== undefined) {
						for (const x in profile.case[c].datafield) {
							const datafield = profile.case[c].datafield[x];
							const {shortcut, val} = await getValue(that.telegram.userData, datafield);
							const {newVal, unit} = await convertValue(datafield, val, that);
							if (!shortcut) {
								break;
							}
							if (newVal !== null) {
								await that.setState(that.telegram.senderID, shortcut, newVal);
							}

							if (unit !== null) {
								await that.extendObject(that.telegram.senderID, shortcut, {common: {unit: unit}});
							}

						}
					} else {
						for (const z in profile.case[c]) {
							const datafield = profile.case[c][z];
							const {shortcut, val} = await getValue(that.telegram.userData, datafield);
							const {newVal, unit} = await convertValue(datafield, val, that);

							if (newVal !== null) {
								that.setState(that.telegram.senderID, shortcut, newVal);
							}

							if (unit !== null) {
								that.extendObject(that.telegram.senderID, shortcut, {common: {unit: unit}});
							}
						}
					}
				}

				//Check if device waits for a direct answer
				if(profile.case[c].auto_answer === true) {
					const parameter = [];
					const data = ByteArray.from();

					for (const d in profile.case[c].datafield) {
						const datafield = profile.case[c].datafield[d];
						if (datafield.data === 'fixed parameter') {
							const bitoffs = datafield.bitoffs;
							const bitsize = datafield.bitsize;
							data.setValue(datafield.value, bitoffs, bitsize);
						} else {
							parameter.push(datafield.shortcut);
						}

					}


					//get data from objects
					for (const s in parameter) {
						const state = await that.adapter.getStateAsync(`${that.adapter.namespace}.${that.telegram.senderID}.${parameter[s]}`);
						await that.setState(`${that.adapter.namespace}.${that.telegram.senderID}.${parameter[s]}`, {ack: true});
						const short = parameter[s];
						const datafield = profile.case[c].datafield;
						for (const d in datafield) {
							if (state !== null && datafield[d].shortcut === short && datafield[d].bitoffs !== null && datafield[d].bitsize !== null && (!datafield[d].condition && !datafield[d].condition[0].value === state.val)) {
								const bitoffs = datafield[d].bitoffs;
								const bitsize = datafield[d].bitsize;
								const value = state.val;
								//Check if there is a converion needed
								if (datafield[d].value_out) {
									const convertedValue = jsonLogic.apply(datafield[d].value_out, {'value': value});
									data.setValue(parseInt(convertedValue), bitoffs, bitsize);
								} else if (value) {
									data.setValue(value, bitoffs, bitsize);
								}
								break;
							} else if (datafield[d].shortcut === short && datafield[d].bitoffs !== null && datafield[d].bitsize !== null && datafield[d].value !== null && datafield[d].value !== undefined) {
								const bitoffs = datafield[d].bitoffs;
								const bitsize = datafield[d].bitsize;
								const value = datafield[d].value;
								data.setValue(value, bitoffs, bitsize);
							}
						}
					}

					const subTelNum = [0x00];
					if(dev.native.broadcast){
						that.telegram.senderID = 'ffffffff';
					}
					const tempId = that.telegram.senderID.toUpperCase().match(/.{1,2}/g);
					const receiverID = [];
					for(const b in tempId) {
						// receiverID.push('0x' + tempId[b]);
						receiverID.push(parseInt(tempId[b], 16));
					}
					const gateway = await that.adapter.getObjectAsync('gateway');
					let baseID = gateway.native.BaseID;

					if (dev.native.Sender_ID) {
						baseID = dev.native.Sender_ID;
					}
					baseID = ByteArray.from(baseID.match(/.{1,2}/g));

					const optionalData = subTelNum.concat(receiverID, [0xFF, 0x00]);
					let type, finalData;
					switch (rorg) {

						case 'D2': {
							type = [0xD2];
							finalData = type.concat(data, baseID, [0x00]);
							break;
						}
						case 'A5': {
							type = [0xA5];
							if (data.length > 4 || data.length < 4) {
								that.adapter.log.warn(`The data length for a 4BS telegram is incorrect. The length is ${data.length}`);
							}
							finalData = type.concat(data, baseID, [0x00]);
							break;
						}
						case 'F6': {
							type = [0xF6];
							if (data.length > 1 || data.length < 1) {
								that.adapter.log.warn(`The data length for a RPS telegram is incorrect. The length is ${data.length}`);
							}
							finalData = type.concat(data, baseID, [0x30]);
							break;
						}
						case 'D5': {
							type = [0xD5];
							if (data.length > 1 || data.length < 1) {
								that.adapter.log.warn(`The data length for a 1BS telegram is incorrect. The length is ${data.length}`);
							}
							finalData = type.concat(data, baseID, [0x00]);
							break;
						}
					}
					that.adapter.queue.push({'data': finalData, 'optionaldata': optionalData, 'packettype': 0x01});

				}
			}
		}
	}
}

/**
 *
 * @param {object} _this
 * @param {string} deviceId
 * @returns {Promise<void>}
 */
async function deleteDevice(_this, deviceId) {
	await _this.adapter.getObjectListAsync({startkey: _this.adapter.namespace + '.' + deviceId, endkey: _this.adapter.namespace + '.' + deviceId + '.\u9999'})
		.then(async result => {
			for (const r in result.rows) {
				await _this.adapter.delObjectAsync(result.rows[r].id)
					.then(result => {
						_this.adapter.log.debug(result);
					}, reject => {
						_this.adapter.log.error(reject);
					});
			}
		}, reject => {
			_this.adapter.log.error(reject);
		});
}

/**
 *
 * @param {string} baseID
 * @param {number} summand
 * @returns {Promise<string>}
 */
async function additionID(baseID, summand){
	const patt = new RegExp(/^0x/);
	if(!patt.test(baseID)) {
		baseID = '0x' + baseID;
	}
	const idDec = parseInt(baseID) + summand;
	return idDec.toString(16);

}

async function addEltakoDevice(_this, baseID, offset) {
	const patt = new RegExp('00d0fe');
	const res = patt.test(_this.telegram.userData);
	if (res) {
		return;
	}
	const devTelegram = _this.telegram.userData.replace('00d0ff', '').toUpperCase();
	const type = [0xA5];
	const subTelNum = [0x01];
	const tempId = _this.senderID.toUpperCase().match(/.{1,2}/g); //device address who will receive the response
	const receiverID = []; //tempId has to be split into array for usage
	for (const b in tempId) {
		// receiverID.push('0x' + tempId[b]);
		receiverID.push(parseInt(tempId[b], 16));
	}
	const optionalData = subTelNum.concat(receiverID, [0xFF, 0x00]); //building optional data array

	const offs = (offset !== undefined) ? parseInt(offset) + 1 : 0;
	const newIDdecimal = await additionID(baseID, offs);
	const newID = ByteArray.from( newIDdecimal.match(/.{1,2}/g) );
	_this.IDoffset = true;

	if (!eltakoDevices[devTelegram]) {
		_this.adapter.log.info(`Could not identify teachin telegram, ${devTelegram}, from Eltako device.`);
		return;
	}

	switch(eltakoDevices[devTelegram].name) {
		case 'fd62np-230v':
		case 'fd62npn-230v': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako FD62NP(N)-230V detected');

			const data = ByteArray.from([0xE0, 0x40, 0x0D, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout( async () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5 * 1000);
			await createObjects(_this, `TF-13-07`, Enocean_manufacturer[`0x00D`]);
			await createObjects(_this, `TF-13-06`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['TF-13-07',
						'TF-13-06']
				}
			});
			break;
		}
		case 'fhk61-230v': {
			break;
		}
		case 'fkld61': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako FKLD61 detected');

			const data = ByteArray.from([0xE0, 0x40, 0x0D, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout( async () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5 * 1000);
			await createObjects(_this, `TF-13-07`, Enocean_manufacturer[`0x00D`]);
			await createObjects(_this, `TF-13-06`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['TF-13-07', 'TF-13-06']
				}
			});
			break;
		}
		case 'flc61np': {
			break;
		}
		case 'fld61': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako FLD61 detected');

			const data = ByteArray.from([0xE0, 0x40, 0x0D, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout( async () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5 * 1000);
			await createObjects(_this, `TF-13-07`, Enocean_manufacturer[`0x00D`]);
			await createObjects(_this, `TF-13-06`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['TF-13-07', 'TF-13-06']
				}
			});
			break;
		}
		case 'fl62np-230v': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako FL62 detected');

			const data = ByteArray.from([0xE0, 0x40, 0x0D, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout( async () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5 * 1000);
			await createObjects(_this, `TF-13-11`, Enocean_manufacturer[`0x00D`]);
			await createObjects(_this, `TF-14-02`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['TF-13-11',
						'TF-14-02']
				}
			});
			break;
		}
		case 'fms61np-230v': {
			break;
		}
		case 'fmz61-230v': {
			break;
		}
		case 'fud61np-230v':
		case 'fud61npn-230v': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako FUD61NPN-230V detected');

			const data = ByteArray.from([0xE0, 0x40, 0x0D, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout( async () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5 * 1000);
			await createObjects(_this, `TF-13-07`, Enocean_manufacturer[`0x00D`]);
			await createObjects(_this, `TF-13-06`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['TF-13-07', 'TF-13-06']
				}
			});

			break;
		}
		case 'fud62npn-ble': {
			break;
		}
		case 'frm60': {
			break;
		}
		case 'fsb61np-230v': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako FSB61NP-230V detected');

			const data = ByteArray.from([0xFF, 0xF8, 0x0D, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout( async () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5 * 1000);
			await createObjects(_this, `TF-13-03`, Enocean_manufacturer[`0x00D`]);
			await createObjects(_this, `TF-13-04`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['TF-13-03', 'TF-13-04']
				}
			});
			break;
		}
		case 'fsb62-ble': {
			break;
		}
		case 'fsb64': {
			break;
		}
		case 'fsb71-230v': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako FSB61NP-230V detected');

			const data = ByteArray.from([0xFF, 0xF8, 0x0D, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout( async  () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5 * 1000);
			await createObjects(_this, `TF-13-03`, Enocean_manufacturer[`0x00D`]);
			await createObjects(_this, `TF-13-04`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['TF-13-03', 'TF-13-04']
				}
			});
			break;
		}
		case 'fsb71-2x-230v': {
			break;
		}
		case 'fsb71-24vdc': {
			break;
		}
		case 'fsg71/1-10v': {
			break;
		}
		case 'fsha': {
			break;
		}
		case 'fsr61-230v': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako FSR61 detected');

			const data = ByteArray.from([0xE0, 0x40, 0x0D, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout( async () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5 * 1000);
			await createObjects(_this, `TF-01-02`, Enocean_manufacturer[`0x00D`]);
			await createObjects(_this, `TF-14-02`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['TF-01-02', 'TF-14-02']
				}
			});
			break;
		}
		case 'fsr62-ble': {
			break;
		}
		case 'fsr62np2-ble': {
			break;
		}
		case 'fsr64': {
			break;
		}
		case 'fsr71np-2x-230v': {
			break;
		}
		case 'fsr71np-4x-230v': {
			break;
		}
		case 'fsr71ssr-2x-230v': {
			break;
		}

		case 'ftkb-hg': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako FTKB-hg detected');

			const data = ByteArray.from([0x50, 0x50, 0x16, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout( async () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5 * 1000);
			await createObjects(_this, `A5-14-0A`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['A5-14-0A']
				}
			});
			break;
		}
		case 'ftn61np-230v': {
			break;
		}
		case 'tf-tax5d': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako TF-TAx5D detected');

			const data = ByteArray.from([0xE0, 0x40, 0x0D, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout ( async () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5 * 1000);
			await createObjects(_this, `TF-01-01`, Enocean_manufacturer[`0x00D`]);
			await createObjects(_this, `F6-02-02`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['TF-01-01', 'F6-02-02']
				}
			});

			break;
		}
		case 'tf-tax5j': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako TF-TAx5J detected');

			const data = ByteArray.from([0xFF, 0xF8, 0x0D, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout( async () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5 * 1000);
			//TODO: Use teachinInfo instead hardcoded eep
			await createObjects(_this, `TF-01-01`, Enocean_manufacturer[`0x00D`]);
			await createObjects(_this, `TF-13-04`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['TF-01-01', 'TF-13-04']
				}
			});

			break;
		}
		case 'tf-tax5l': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako TF-TAx5L detected');

			const data = ByteArray.from([0xE0, 0x40, 0x0D, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout( async () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5 * 1000);
			await createObjects(_this, `TF-01-01`, Enocean_manufacturer[`0x00D`]);
			await createObjects(_this, `F6-02-02`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['TF-01-01', 'F6-02-02']
				}
			});

			break;
		}
		case 'tf61d-230v': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako TF61D-230V detected');

			const data = ByteArray.from([0xE0, 0x40, 0x0D, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout( async () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5 * 1000);
			await createObjects(_this, `TF-13-07`, Enocean_manufacturer[`0x00D`]);
			await createObjects(_this, `F6-02-02`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['TF-13-07', 'F6-02-02']
				}
			});

			break;
		}
		case 'fta65j':
		case 'fta55j':
		case 'tf61j-230v': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako TF61J-230V / FTA65J / FTA55J detected');

			const  data = ByteArray.from([0xFF, 0xF8, 0x0D, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout( async () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5 * 1000);
			await createObjects(_this, `TF-01-01`, Enocean_manufacturer[`0x00D`]);
			await createObjects(_this, `TF-13-04`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['TF-01-01', 'TF-13-04']
				}
			});

			break;
		}
		case 'tf61l-230v': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako TF61L-230V detected');

			const data = ByteArray.from([0xE0, 0x40, 0x0D, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout( async () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5 * 1000);
			await createObjects(_this, `TF-01-02`, Enocean_manufacturer[`0x00D`]);
			await createObjects(_this, `TF-13-05`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['TF-01-02', 'TF-13-05']
				}
			});

			break;
		}
		case 'tf100d': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako TF100D detected');

			const data = ByteArray.from([0xE0, 0x40, 0x0D, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout( async () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5 * 1000);

			await createObjects(_this, `TF-13-07`, Enocean_manufacturer[`0x00D`]);
			await createObjects(_this, `F6-02-02`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['TF-13-07', 'F6-02-02']
				}
			});

			break;
		}
		case 'tf100l': {
			_this.adapter.setState('gateway.teachin', {val: false, ack: true});
			_this.adapter.log.info('Eltako TF100L detected');

			const data = ByteArray.from([0xE0, 0x40, 0x0D, 0x80]); //initialize data array
			const finalData = type.concat(data, newID, [0x00]);
			setTimeout( async () => {
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
				await _this.sendData(_this.adapter, finalData, optionalData, 0x01); //0x01 = Packet Type ERP1
			}, 5* 1000);
			await createObjects(_this, `TF-01-02`, Enocean_manufacturer[`0x00D`]);
			await createObjects(_this, `TF-13-05`, Enocean_manufacturer[`0x00D`]);

			await _this.adapter.extendObjectAsync(_this.senderID.toLowerCase(), {
				'native': {
					'eep': ['TF-01-02', 'TF-13-05']
				}
			});

			break;
		}
		default: {
			_this.adapter.log.info(`Autocreate of Eltako Device "${eltakoDevices[devTelegram].name}" not yet implemented.`);
		}
	}
}


module.exports = {
	handleType1: handleType1,
	handleType2: handleType2,
	handleType4: handleType4,
	handleType10: handleType10,
	handleTeachIn: handleTeachIn,
	manualTeachIn: manualTeachIn,
	predifnedDeviceTeachin: predefinedDeviceTeachIn
};
