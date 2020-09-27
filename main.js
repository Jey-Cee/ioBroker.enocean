'use strict';

const utils = require('@iobroker/adapter-core');
const SerialPort = require('serialport');
const os = require('os');
const fs = require('fs');
const path = require('path');

// structured representation for ESP3 packets
const ESP3Packet = require('./lib/tools/ESP3Packet').ESP3Packet;
const ResponseTelegram = require('./lib/tools/ESP3Packet').ResponseTelegram;

const SERIALPORT_PARSER_CLASS = require('./lib/tools/Serialport_parser');
const CRC8 = require('./lib/tools/CRC8.js');
const ByteArray = require('./lib/tools/byte_array');
const HandleType1 = require('./lib/tools/Packet_handler').handleType1;
const HandleType2 = require('./lib/tools/Packet_handler').handleType2;
const HandleTeachIn = require('./lib/tools/Packet_handler').handleTeachIn;
const ManualTeachIn = require('./lib/tools/Packet_handler').manualTeachIn;

const Enocean_manufacturer = require('./lib/definitions/manufacturer_list.json');
const Codes = require('./lib/definitions/codes.json');

const EEPList = require('./lib/definitions/EEPinclude');


const PLATFORM = os.platform();

let AVAILABLE_PORTS = {};
let SERIAL_PORT = null;
let SERIALPORT_ESP3_PARSER = null;

class Enocean extends utils.Adapter {

	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'enocean',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('objectChange', this.onObjectChange.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Reset the connection indicator during startup
		this.setState('info.connection', false, true);

		this.setState('gateway.teachin', {val: false, ack: true});

		// in this template all states changes inside the adapters namespace are subscribed
		this.subscribeStates('gateway.*');
		this.subscribeStates('*.CMD');

		// get the list of available serial ports. Needed for win32 systems.
		let ports = await SerialPort.list();

		AVAILABLE_PORTS = ports.map(p => p.path);

		if (this.config.serialport) {
			SERIAL_PORT = new SerialPort(this.config.serialport, { baudRate: 57600});
			SERIALPORT_ESP3_PARSER = SERIAL_PORT.pipe(new SERIALPORT_PARSER_CLASS());
			await this.packetListener();
		}

	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			if (SERIAL_PORT !== null) {
				SERIAL_PORT.close();
			}

			this.setState('info.connection', false, true);

			this.log.info('cleaned everything up...');
			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed object changes
	 * @param {string} id
	 * @param {ioBroker.Object | null | undefined} obj
	 */
	onObjectChange(id, obj) {
		if (obj) {
			// The object was changed
			this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.info(`object ${id} deleted`);
		}
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	async onStateChange(id, state) {
		const tmp = id.split('.');
		const objName = tmp.slice(2).join('.');

		switch(objName){
			case 'gateway.teachin':

				if(!state){
					this.log.info('Teachin mode de-activated');
					this.setState(id, {val: false, ack: true});
				} else if(state.val === true && state.ack === false) {
					this.log.info('Teachin mode active');
					this.setState(id, {ack: true, expire: 60});
				}
				break;
		}

		if (state) {
			// The state was changed
			//this.log.info(`state ${objName} changed: ${state.val} (ack = ${state.ack})`);

			const obj  = await this.getObjectAsync(`${this.namespace}.${tmp[2]}`);

			if(obj && obj.type === 'device' && tmp[2] !== 'gateway'){
				const devId = obj.native.id;
				this.log.info('Send command to device: ' + devId);
				const eep = obj.native.eep[0]; //returns a object for cases where more than one eep is present
				const eepProfile = EEPList[eep.replace(/-/g, '')];
				const subId = objName.replace(/.*\./g, '');
				const rorg = eepProfile.rorg_number;

				switch(subId){
					case 'CMD': {
						let data = ByteArray.from();
						let send = true;
						/*if(rorg === '0xA5'){
							data.set([0x00, 0x00, 0x00, 0x00]);
						}*/

						for (let c in eepProfile.case) {

							/*if (eepProfile.case[c].send !== undefined && eepProfile.case[c].send === false) {
								this.log.info('command soll nicht gesendet werden');
								continue;
							}else{
								this.log.info('command soll gesendet werden');
							}*/

							let param = [];
							if (eepProfile.case[c].condition && eepProfile.case[c].condition.command && eepProfile.case[c].condition.command[0].value === state.val && eepProfile.case[c].send !== undefined && eepProfile.case[c].send === false) {
								//prevent send data if telegram was received
								send = false;
								break;
							}else if(eepProfile.case[c].condition && eepProfile.case[c].condition.command && eepProfile.case[c].condition.command[0].value === state.val){
								for (let d in eepProfile.case[c].datafield) {
									param.push(eepProfile.case[c].datafield[d].shortcut);
								}
							} else if (!eepProfile.case[c].condition) {
								for (let d in eepProfile.case[c].datafield) {
									param.push(eepProfile.case[c].datafield[d].shortcut);
								}
							}

							for (let s in param) {
								const state = await this.getStateAsync(`${this.namespace}.${devId}.${param[s]}`);
								const short = param[s];
								for (let d in eepProfile.case[c].datafield) {
									if (state !== null && eepProfile.case[c].datafield[d].shortcut === short && eepProfile.case[c].datafield[d].bitoffs !== null && eepProfile.case[c].datafield[d].bitsize !== null && (!eepProfile.case[c].datafield[d].condition || !eepProfile.case[c].datafield[d].condition[0].value === state.val)) {
										const bitoffs = eepProfile.case[c].datafield[d].bitoffs;
										const bitsize = eepProfile.case[c].datafield[d].bitsize;
										data.setValue(state.val, bitoffs, bitsize);
									} else if (eepProfile.case[c].datafield[d].bitoffs !== null && eepProfile.case[c].datafield[d].bitsize !== null && eepProfile.case[c].datafield[d].value !== null) {
										const bitoffs = eepProfile.case[c].datafield[d].bitoffs;
										const bitsize = eepProfile.case[c].datafield[d].bitsize;
										const value = eepProfile.case[c].datafield[d].value;
										if(value) data.setValue(value, bitoffs, bitsize);
									}
								}
							}
						}

						if(send === false || !data){
							break;
						}

						const subTelNum = [0x00];
						let tempId = devId.toUpperCase().match(/.{1,2}/g);
						let receiverID = [];
						for(let b in tempId){
							receiverID.push('0x' + tempId[b]);
						}
						let optionalData = subTelNum.concat(receiverID, [0xFF, 0x00]);
						let type;
						switch (rorg) {

							case '0xD2':
								type = [0xD2];
								data = type.concat(data, [0xFF, 0xCA, 0xE7, 0x00, 0x01]);
								break;
							case '0xA5':
								type = [0xA5];
								data = type.concat(data, [0xFF, 0xCA, 0xE7, 0x00, 0x00]);
								break;
						}
						await this.sendData(data, optionalData, 0x01);


						break;
					}
				}
			}
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	/**
	 * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	 * Using this method requires "common.message" property to be set to true in io-package.json
	 * @param {ioBroker.Message} obj
	 */
	onMessage(obj) {

		// responds to the adapter that sent the original message
		function respond(response, that) {
			if (obj.callback)
				that.sendTo(obj.from, obj.command, response, obj.callback);
		}

		switch(obj.command){
			case 'listSerial':
				// enumerate serial ports for admin interface
				try {
					const ports = this.listSerial();
					this.log.info(JSON.stringify(ports));
					respond({ error: null, result: ports }, this);
				} catch (e) {
					respond({ error: e, result: ['Not available'] }, this);
				}
				break;
			case 'getManufacturerList':
				respond(Enocean_manufacturer, this);
				break;
			case 'getEEPList':
				respond(EEPList, this);
				break;
			case 'autodetect':
				this.setState('gateway.teachin', true);
				break;
			case 'newDevice':
				new ManualTeachIn(this, obj.message.eep, obj.message.mfr, obj.message.id, obj.message.name);
				break;
		}
	}

	// filter serial devices function filterSerialPorts(path) {
	filterSerialPorts(path) {
		// get only serial port names
		if (!(/(tty(ACM|USB|AMA|MFD|Enocean|enocean|EnOcean|\.usbserial-)|rfcomm)/).test(path)) return false;

		return fs
			.statSync(path)
			.isCharacterDevice();
	}

	// list serial ports
	listSerial() {
		let result;

		if (PLATFORM === 'linux' || PLATFORM === 'darwin') {
			// Filter out the devices that aren't serial ports
			const devDirName = '/dev';

			let ports;
			try {
				ports = fs
					.readdirSync(devDirName)
					.map(function (file) {
						return path.join(devDirName, file);
					})
					.filter(this.filterSerialPorts)
					.map(function (port) {
						return { path: port };
					});
			} catch (e) {
				this.log.error('Cannot read "' + devDirName + '": ' + e);
				ports = [];
			}
			result = ports.map(p => p.path);
		} else if (PLATFORM === 'win32') {
			result = AVAILABLE_PORTS;
		}
		return result;
	}

	async packetListener() {
		//open serial port, set adapter state to connected and wait for messages
		SERIAL_PORT.on('open', async () => {
			this.setState('info.connection', true, true);
			await this.getGatewayInfo();
		});


		//listen to error messages from serial port
		SERIAL_PORT.on('error', (err) => {
			this.log.warn('An error occured at serial port: ' + err);
		});

		//listen to close serial port
		SERIAL_PORT.on('close', () => {
			this.log.info('The serial port was closed.');
			this.setState('info.connection', false, true);
		});

		SERIALPORT_ESP3_PARSER.on('data', (data) => {
			this.parseMessage(data);
		});
	}

	/**
	 * Parses a data package from the ESP3 serial interface
	 * @param {Buffer} data The received data
	 */
	async parseMessage(data) {
		this.log.debug(data.toString('hex'));
		const packet = new ESP3Packet(data);

		switch (packet.type) {
			case 1: // RADIO_ERP1
			{
				let teachin = await this.getStateAsync(this.namespace + '.gateway.teachin');

				if (teachin.val === false) {
					new HandleType1(this, packet);
				} else if (teachin.val === true) {
					new HandleTeachIn(this, packet);
				}

				break;
			}
			case 2: //RESPONSE
			{
				//new HandleType2(this, packet);
				this.log.debug('Packet type 2 received: ' + toHex(packet.type));
				break;
			}
			case 3: //RADIO_SUB_TEL
				this.log.debug('Radio sub telegram received.');
				break;
			case 4: //EVENT
				this.log.debug('Event message received.');
				break;
			case 5: //COMMON_COMMAND
				this.log.debug('Common command received.');
				break;
			case 6: //SMART_ACK_COMMAND
				this.log.debug('Smart Ack command received.');
				break;
			case 7: //REMOTE_MAN_COMMAND
				this.log.debug('Remote management command received.');
				break;
			case 9: //RADIO_MESSAGE
				this.log.debug('Radio message received.');
				break;
			case 10: //RADIO_ERP2
				this.log.debug('ERP2 protocol radio telegram received.');
				break;
			case 16: //RADIO_802_15_4
				this.log.debug('802_15_4_RAW Packet received.');
				break;
			case 17: //COMMAND_2_4
				this.log.debug('2.4 GHz Command received.');
				break;
			default:
				this.log.debug('Packet type ' + toHex(packet.type) + ' has been received, but is not handled.');
				break;
		}
	}

	async getGatewayInfo(){
		let data, appVersion_main, appVersion_beta, appVersion_alpha, appVersion_build, apiVersion_main, apiVersion_beta, apiVersion_alpha, apiVersion_build, chipId, chipVersion, appDescription, repEnable, repLevel, frequency, protocol, baseId;

		//03: CO_RD_VERSION
		data = Buffer.from([0x03]);
		const rd_version = await this.sendData(data, null, 5);
		if(rd_version === true){
			const returnData = await this.waitForResponse();
			appVersion_main = parseInt(returnData.slice(7, 8).toString('hex'), 16);
			appVersion_beta = parseInt(returnData.slice(8, 9).toString('hex'), 16);
			appVersion_alpha = parseInt(returnData.slice(9, 10).toString('hex'), 16);
			appVersion_build = parseInt(returnData.slice(10, 11).toString('hex'), 16);
			apiVersion_main = parseInt(returnData.slice(11, 12).toString('hex'), 16);
			apiVersion_beta = parseInt(returnData.slice(12, 13).toString('hex'), 16);
			apiVersion_alpha = parseInt(returnData.slice(13, 14).toString('hex'), 16);
			apiVersion_build = parseInt(returnData.slice(14, 15).toString('hex'), 16);
			chipId  = returnData.slice(15, 19).toString('hex');
			chipVersion = returnData.slice(19, 23).toString('hex');
			appDescription = returnData.slice(23, 39).toString('utf8').replace(/\u0000/g, '');
		}

		//10: CO_RD_REPEATER
		data = Buffer.from([0x0A]);
		const rd_repeater = await this.sendData(data, null, 5);
		if(rd_repeater === true){
			const returnData = await this.waitForResponse();
			repEnable = returnData.slice(7, 8);
			repLevel = returnData.slice(8, 9);
		}

		//37: CO_GET_FREQUENCY_INFO
		data = Buffer.from([0x25]);
		const get_frequency = await this.sendData(data, null, 5);
		if(get_frequency === true){
			const returnData = await this.waitForResponse();
			frequency = '0x' + returnData.slice(7, 8).toString('hex');
			protocol = '0x' + returnData.slice(8, 9).toString('hex');
		}

		//08: CO_RD_IDBASE
		data = Buffer.from([0x08]);
		const rd_idbase = await this.sendData(data, null, 5);
		if(rd_idbase === true){
			const returnData = await this.waitForResponse();
			const telegram = new ResponseTelegram(returnData);
			baseId = telegram.data.toString('hex');
		}

		await this.extendObjectAsync('gateway', {
			native: {
				BaseID: baseId,
				Frequency: Codes.frequency[frequency],
				Protocol: Codes.protocol[protocol],
				AppVersion: `${appVersion_main}.${appVersion_beta}.${appVersion_alpha}.${appVersion_build}`,
				ApiVersion: `${apiVersion_main}.${apiVersion_beta}.${apiVersion_alpha}.${apiVersion_build}`,
				ChipID: chipId,
				ChipVersion: chipVersion,
				AppDescription: appDescription
			}
		});
	}

	waitForResponse() {
		return new Promise((resolve) => {
			SERIAL_PORT.once('data', (data)=>{
				resolve(data);
			});
		});
	}

	/**
	 *
	 * @param {array} data
	 * @param {array} optionalData
	 * @param {number} packetType
	 * @returns {Promise<boolean>}
	 */
	async sendData(data, optionalData, packetType){
		const sync = Buffer.from([0x55]);
		const dataLenHex = dec2hexString(data.length);
		const header = Buffer.from([ '0x' + dataLenHex.substring(1, 2), '0x' + dataLenHex.substring(3, 4), optionalData !== null ? 0x07 : 0x00, packetType.toString(16) ]);
		const crc8h = Buffer.from([CRC8.calcCrc8(header)]);
		const crc8d = Buffer.from([CRC8.calcCrc8(optionalData !== null ? data.concat(optionalData) : data)]);
		let payload;

		if(optionalData !== null){
			payload = [sync, header, crc8h, Buffer.from(data), Buffer.from(optionalData), crc8d];
		}else{
			payload = [sync, header, crc8h, Buffer.from(data), crc8d];
		}

		this.log.debug('Sent data: ' + Buffer.concat(payload).toString('hex'));

		SERIAL_PORT.write(Buffer.concat(payload), (err) => {
			if(err){
				this.log.warn('Error sending data: ' + err);
				return false;
			}
		});

		return true;
	}
}

// convert byte to hex
function toHex(byte) {
	return ('0' + (byte & 0xFF).toString(16)).slice(-2);
}

function dec2hexString(dec) {
	return (dec+0x10000).toString(16).substr(-4).toUpperCase();
}





// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Enocean(options);
} else {
	// otherwise start the instance directly
	new Enocean();
}
