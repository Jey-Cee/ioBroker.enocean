'use strict';

const RadioTelegram = require('./ESP3Packet').RadioTelegram;
const ResponseTelegram = require('./ESP3Packet').ResponseTelegram;
const ESP3Packet = require('./ESP3Packet').ESP3Packet;
const OneBSTeachIn = require('./ESP3Packet').OneBSTeachIn;
const FourBSTeachIn = require('./ESP3Packet').FourBSTeachIn;

const jsonLogic = require('json-logic-js');

const ByteArray = require('./byte_array');

const Enocean_manufacturer = require('../definitions/manufacturer_list.json');
const EEPList = require('../definitions/EEPinclude');

const OneBS = 213;
const FourBS = 165;
const RPS = 246;
const UTE = 212;
const MSC = 209;
const SmartACK = 198;
const VLD = 210;

class handleType1 {
	/**
	 * @param {Object} that
	 * @param {ESP3Packet} ESP3Packet
	 */
	constructor(that, ESP3Packet) {
		this.adapter = that;
		this.info = that.log.info;
		this.telegram = new RadioTelegram(ESP3Packet);
		this.senderID = this.telegram.senderID;
		this.tType = this.telegram.type;
		this.rssi = ESP3Packet.optionalData['5'];


		//bind class functions to context of constructor
		this.main.bind(this);

		this.adapter.log.debug('Message for ID ' + this.senderID + ' has been received.');

		this.main();

	}

	async main() {
		//get device object
		const dev = await this.adapter.getObjectAsync(this.adapter.namespace + '.' + this.senderID);
		if (dev !== null) {
			//set RSSI
			await this.adapter.setStateAsync(this.telegram.senderID + '.rssi', {val: - this.rssi, ack: true});
			let eep = dev.native.eep;
			for (const e in eep) {
				eep = eep[e].replace(/-/g, '');
				const profile = EEPList[eep];

				for (const c in profile.case) {

					//Check if there are conditions to choose the right data handling
					//conditions are optional
					let condition_res = null;
					if (profile.case[c].condition !== undefined) {

						for (const s in profile.case[c].condition) {
							const keys = Object.keys(profile.case[c].condition);
							if (keys[0] === 'statusfield') {
								const condition = profile.case[c].condition[s];

								if (condition.length !== undefined) {
									for (const con in profile.case[c].condition[s]) {
										const check = profile.case[c].condition[s][con];
										const bitoffs = parseInt(check.bitoffs);
										const bitsize = parseInt(check.bitsize);
										const value = ByteArray.from(this.telegram.status).getValue(bitoffs, bitsize);
										if (value === parseInt(check.value) && condition !== false) {
											condition_res = true;
										} else {
											condition_res = false;
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
										const value = ByteArray.from(this.telegram.userData).getValue(bitoffs, bitsize);
										if (value === parseInt(check.value) && condition !== false) {
											condition_res = true;
										} else {
											condition_res = false;
										}

									}
								}else{
									const check = profile.case[c].condition[s];
									const bitoffs = parseInt(check.bitoffs);
									const bitsize = parseInt(check.bitsize);
									const value = ByteArray.from(this.telegram.userData).getValue(bitoffs, bitsize);
									if (value === parseInt(check.value) && condition !== false) {
										condition_res = true;
									} else {
										condition_res = false;
									}
								}
							}

						}

					}
					//look for data and decode them
					if (condition_res === true || condition_res === null) {

						if (profile.case[c].datafield !== undefined) {

							for (const x in profile.case[c].datafield) {
								const datafield = profile.case[c].datafield[x];

								let {shortcut, val} = await this.getValue(this.telegram.userData, datafield);
								let {newVal, unit} = await this.convertValue(datafield, val);

								if(newVal !== null){
									this.setState(this.telegram.senderID, shortcut, newVal);
								}

								if(unit !== null){
									this.extendObject(this.telegram.senderID, shortcut, {common: {unit: unit}});
								}

							}
						} else {
							for (const z in profile.case[c]) {
								const datafield = profile.case[c][z];
								let {shortcut, val} = await this.getValue(this.telegram.userData, datafield);
								let {newVal, unit} = await this.convertValue(datafield, val);

								if(newVal !== null){
									this.setState(this.telegram.senderID, shortcut, newVal);
								}

								if(unit !== null){
									this.extendObject(this.telegram.senderID, shortcut, {common: {unit: unit}});
								}
							}
						}
					}
				}
			}
		}
	}


	async setState(deviceId, shortcut, value){
		await this.adapter.setStateAsync(this.adapter.namespace + '.' + deviceId + '.' + shortcut, {val: value, ack: true});
	}

	async extendObject(deviceId, shortcut, obj){
		await this.adapter.extendObjectAsync(this.adapter.namespace + '.' + deviceId + '.' + shortcut, obj);
	}

	async convertValue(datafield, value) {
		let test = false;
		let unit = null;
		let secondArg;	//if secondArgument is given this will be filled with this value that comes from other datafield
		if(datafield.secondArgument){
			secondArg = await this.getValue(this.telegram.userData, datafield.secondArgument);
			test = jsonLogic.apply(datafield.condition, {'value': value, 'value2': secondArg.val});
			if(test === false) test = null;
		}else if (datafield.condition) {
			test = jsonLogic.apply(datafield.condition, {'value': value});
		}
		if(test !== null && datafield.value){
			test = jsonLogic.apply(datafield.value, {'value': value});
		}
		if(typeof test === 'number' && datafield.decimals){
			const num = Number(test);
			test = num.toFixed(datafield.decimals);
		}

		if(datafield.unit){
			unit = jsonLogic.apply(datafield.unit, {'value2': secondArg.val});
		}

		return {newVal: test, unit: unit};
	}


	/**
	 * get Value from data telegram
	 * @param {any} telegram
	 * @param {object} data - datafield description from EEP file
	 * @returns {Promise<{val: (Promise<{val: *, shortcut: *}>|number|string), shortcut}>}
	 */
	async getValue(telegram, data){
		const shortcut = data.shortcut ? data.shortcut : '';
		const bitoffs = parseInt(data.bitoffs);
		const bitsize = parseInt(data.bitsize);
		const value = ByteArray.from(telegram).getValue(bitoffs, bitsize);
		return {shortcut: shortcut, val: value};
	}

	logInfo(variable){
		let info = {};
		info.type = typeof variable;
		info.length = variable.length;
		if(typeof variable !== 'string' || typeof variable !== 'number'){
			info.value = JSON.stringify(variable);
		}
		info.value = variable;

		this.adapter.log.info(JSON.stringify(info));
	}
}

class handleType2{
	/**
	 * @param {Object} that
	 * @param {ESP3Packet} ESP3Packet
	 */
	constructor(that, ESP3Packet) {
		this.adapter = that;
		this.info = that.log.info;
		this.telegram = new ResponseTelegram(ESP3Packet);
		this.senderID = this.telegram.senderID;
		this.tType = this.telegram.type;
		this.rssi = ESP3Packet.optionalData['5'];

		//bind class functions to context of constructor
		this.main.bind(this);

		this.main();
	}

	async main(){
		const returnCode = this.telegram.data[0];
		this.info(returnCode);
	}
}

class handleTeachIn{
	/**
	 *
	 * @param {Object} that
	 * @param {ESP3Packet} ESP3Packet
	 */
	constructor(that, ESP3Packet) {
		this.adapter = that;
		this.sendData = that.sendData;
		this.log = that.log;
		this.telegram = new RadioTelegram(ESP3Packet);
		this.senderID = this.telegram.senderID;
		this.tType = this.telegram.type;

		this.main.bind(this);

		this.main();
	}

	async main() {
		switch(this.tType) {
			case FourBS:
			{
				const teachinData = new FourBSTeachIn(this.telegram.userData);
				if (teachinData.teachIn === 0) {
					//Teach-In variations (LRNtype): 0 = without EEP and Manufacturer ID, 1 = with EEP and Manufacturer ID
					if (teachinData.LRNtype === 1) {
						const FUNC = await addLeadingZero(teachinData.EEPFunc.toString(16));
						const TYPE = await addLeadingZero(teachinData.EEPType.toString(16));
						const MANUFACTURER = Enocean_manufacturer['0x0' + teachinData.mfrID.toString(16)];
						this.adapter.log.info(`EEP A5-${FUNC}-${TYPE} detected for device with ID ${this.senderID}, manufacturer: ${MANUFACTURER}`);
						await createObjects(this, `A5-${FUNC}-${TYPE}`, MANUFACTURER);
					} else if (teachinData.LRNtype === 0) {
						const lrnStatus = ByteArray.from(this.telegram.userData).getValue(27, 1);
						const lrnResult = ByteArray.from(this.telegram.userData).getValue(26, 1);
						const eepResult = ByteArray.from(this.telegram.userData).getValue(25, 1);
						this.adapter.log.debug(`LRN Status: ${lrnStatus}, LRN Result: ${lrnResult}, EEP Result: ${eepResult} The ID is "${this.senderID}"`);
						this.adapter.log.info(`Teach-In: 4BS (A5) Telegram without EEP and manufacturer ID detected, you have to add this device manually. The ID is "${this.senderID}"`);
						const type = [0xA5];
						const subTelNum = [0x00];
						const tempId = this.senderID.toUpperCase().match(/.{1,2}/g);
						let receiverID = [];
						for(let b in tempId){
							receiverID.push('0x' + tempId[b]);
						}
						const optionalData = subTelNum.concat(receiverID, [0xFF, 0x00]);
						let data = ByteArray.from([0x00, 0x00, 0x00, 0x00]);
						data.setValue(0, 24, 1);	//LRN Type
						data.setValue(0, 25, 1);	//EEP Result
						data.setValue(1, 26, 1);	//LRN Result
						data.setValue(1, 27, 1);	//LRN Status
						data.setValue(0, 28, 1);	//LRN Bit
						data = type.concat(data, [0xFF, 0xCA, 0xE7, 0x00, 0x00]);
						await this.sendData(data, optionalData, 0x01);
					}
				}
				break;
			}
			case RPS:
				let t21 = ByteArray.from(this.telegram.status).getValue(2, 1);
				let nu = ByteArray.from(this.telegram.status).getValue(3, 1);

				switch (t21 && nu) {
					case (1 && 1):    //EEP F6-02-xx
						await createObjects(this, 'F6-02-02', 'Enocean GmbH');
						this.adapter.log.info('EEP F6-02-xx detected and added to devices');
						break;
					case (0 && 1):    //EEP F6-03-xx
						await createObjects(this, 'F6-02-02', 'Enocean GmbH');
						this.adapter.log.info('EEP F6-03-xx detected and added to devices');
						break;
					case (1 && 0):    //EEP F6-10-xx
						this.adapter.log.info('EEP F6-10-xx detected, please add device manual');
						break;
				}

				this.adapter.log.info(`Teach-In: RPS (F6) Telegram detected, you have to add this device manually if it wasn't added right now. The ID is "${this.telegram.senderID}"`);

				break;
			case UTE:
				//this.adapter.log.info(`Teach-In: UTE (D4) Telegram detected, you have to add this device manually. The ID is "${this.senderID}"`);
				let communication = ByteArray.from(this.telegram.userData).getValue(0, 1);
				let teachInResponse = ByteArray.from(this.telegram.userData).getValue(1, 1);
				let teachInRequest = ByteArray.from(this.telegram.userData).getValue(2, 2);
				let command = ByteArray.from(this.telegram.userData).getValue(4, 4);
				let channels = ByteArray.from(this.telegram.userData).getValue(8, 8);
				let mfr8LSB = ByteArray.from(this.telegram.userData).getValue(16, 8);
				let mfr3MSB = ByteArray.from(this.telegram.userData).getValue(29, 3);
				let TYPE = ByteArray.from(this.telegram.userData).getValue(32, 8);
				let FUNC = ByteArray.from(this.telegram.userData).getValue(40, 8);
				let RORG = ByteArray.from(this.telegram.userData).getValue(48, 8);

				if(teachInRequest === 2 && teachInResponse === 0 && communication === 1){
					const type = [0xD4];
					const subTelNum = [0x01];
					const tempId = this.senderID.toUpperCase().match(/.{1,2}/g); //device address who will receive the response
					const receiverID = []; //tempId has to be split into array for usage
					for(const b in tempId){
						receiverID.push('0x' + tempId[b]);
					}
					const optionalData = subTelNum.concat(receiverID, [0xFF, 0x00]); //building optional data array
					//const optionalData = subTelNum.concat([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x00]);
					let data = ByteArray.from([0x00, 0x01, 0x46, 0x00, 0x0E, 0x01, 0xD2]); //initialize data array
					data.setValue(communication, 0, 1);	//Communication type Uni-/Bi-directional (0/1)
					data.setValue(1, 2, 2);	//Request type
					data.setValue(1, 4, 4);	//Command identifier
					data.setValue(0, 29, 3);	//Manufacturer-ID (3 MSB)
					data = type.concat(data, [0xFF, 0xCA, 0xE7, 0x00, 0x00]);
					await this.sendData(data, optionalData, 0x01); //0x01 = Packet Type ERP1
				}

				this.adapter.log.info(`Communication: ${communication}, Teach-In-Response: ${teachInResponse}, Teach-in-Request: ${teachInRequest}, Command: ${command}, Channels: ${channels}, MFR8LSB: ${mfr8LSB}, MFR3MSB: ${mfr3MSB}, RORG: ${RORG}, FUNC: ${FUNC}, TYPE: ${TYPE}`);
				break;
			case OneBS: {
				const teachinData1BS = new OneBSTeachIn(this.telegram.userData);

				if (teachinData1BS.teachIn === 0) {
					this.adapter.log.info(`Teach-In: 1BS (D5) Telegram detected, you have to add this device manually. The ID is "${this.senderID}"`);
				}
				break;
			}
			case VLD:


				this.adapter.log.info(`Teach-In: VLD (D2) Telegram detected, you have to add this device manually. The ID is "${this.senderID}"`);
				break;
			case SmartACK:
				this.adapter.log.info(`Teach-In: Smart Ack Learn Request (C6) Telegram detected, you have to add this device manually. The ID is "${this.senderID}"`);
				break;
			case MSC:
				this.adapter.log.info(`Teach-In: MSC (D1) Telegram detected, you have to add this device manually. The ID is "${this.senderID}"`);
				break;
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
	 */
	constructor(that, eep, mfr, id, name){
		this.adapter = that;
		this.eep = eep;
		this.mfr = mfr;
		this.senderID = id;
		this.name = name;

		this.main.bind(this);

		this.main();

	}

	async main(){
		await createObjects(this, this.eep, this.mfr);
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
	if(mfr === null){
		mfr = 'EnOcean GmbH';
	}
	const alias = eep.replace(/-/g, '');

	await _this.adapter.setObjectNotExistsAsync(_this.senderID, {
		type: 'device',
		common: {
			name: EEPList[alias].type_title
		},
		native: {
			id: _this.senderID,
			eep: [
				eep
			],
			manufacturer: mfr
		}
	});

	await _this.adapter.setObjectNotExistsAsync(_this.senderID + '.rssi', {
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

	let cases = [];
	if(EEPList[alias].case.length === undefined){
		cases.push(EEPList[alias].case);
	}else{
		cases = EEPList[alias].case;
	}

	for (const i in cases) {
		const Case = cases[i];
		for (const z in Case) {
			for (const y in Case[z]) {
				if (Case[z][y].shortcut !== undefined && Case[z][y].shortcut !== {} && typeof Case[z][y].shortcut !== 'object' && Case[z][y].iobroker) {
					const shortcut = Case[z][y].shortcut;
					const common = Case[z][y].iobroker;
					common.name = Case[z][y].data;

					await _this.adapter.setObjectNotExistsAsync(_this.senderID + '.' + shortcut, {
						type: 'state',
						common,
						native: {}
					});
				}

			}
		}
	}
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

module.exports = {
	handleType1: handleType1,
	handleType2: handleType2,
	handleTeachIn: handleTeachIn,
	manualTeachIn: manualTeachIn
};
