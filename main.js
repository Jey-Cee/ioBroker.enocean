'use strict';

const utils = require('@iobroker/adapter-core');
const { SerialPort } = require('serialport');
const net = require('net');
const os = require('os');
const fs = require('fs');
const path = require('path');


// structured representation for ESP3 packets
const ESP3Packet = require('./lib/tools/ESP3Packet').ESP3Packet;
const ResponseTelegram = require('./lib/tools/ESP3Packet').ResponseTelegram;
const RadioTelegram = require('./lib/tools/ESP3Packet').RadioTelegram;
const SERIALPORT_PARSER_CLASS = require('./lib/tools/Serialport_parser');
const CRC8 = require('./lib/tools/CRC8.js');
const ByteArray = require('./lib/tools/byte_array');
const HandleType1 = require('./lib/tools/Packet_handler').handleType1;
const HandleType2 = require('./lib/tools/Packet_handler').handleType2;
const HandleType4 = require('./lib/tools/Packet_handler').handleType4;
const HandleType10 = require('./lib/tools/Packet_handler').handleType10;
const HandleTeachIn = require('./lib/tools/Packet_handler').handleTeachIn;

const jsonLogic = require('json-logic-js');

const Enocean_manufacturer = require('./lib/definitions/manufacturer_list.json');
const Codes = require('./lib/definitions/codes.json');
const EEPList = require('./lib/definitions/EEPinclude');

const update = require('./lib/update.js');
const dmEnocean  = require('./lib/devicemgmt.js');

const PLATFORM = os.platform();

let AVAILABLE_PORTS = {};
let SERIAL_PORT = null;
let SERIALPORT_PARSER = null;

let tcpClient = null;
let tcpReconnectCounter = 0;

let teachinMethod = null;
let timeoutQueue, timeoutWait, timeoutTeachin, timeoutGateway;


class Enocean extends utils.Adapter {

	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'enocean',
		});
		this.queue = [];
		this.on('ready', this.onReady.bind(this));
		//this.on('objectChange', this.onObjectChange.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));

		this.predifnedDeviceTeachIn = require('./lib/tools/Packet_handler').predifnedDeviceTeachin;

		this.deviceManagement = new dmEnocean(this);

		this.eepList = EEPList;
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		const systemConfig = await this.getForeignObjectAsync('system.config');
		this.systemConfig = systemConfig.common;

		// Reset the connection indicator during startup
		this.setState('info.connection', {val: false, ack: true});

		this.setState('gateway.teachin', {val: false, ack: true});

		await new update(this);

		// in this template all states changes inside the adapters namespace are subscribed
		this.subscribeStates('gateway.*');
		this.subscribeStates('*.CMD');

		//only for development
		const devState = await this.getObjectAsync('development');
		if(devState){
			this.subscribeStates('development.*');
		}


		// get the list of available serial ports. Needed for win32 systems.
		const ports = await SerialPort.list();

		AVAILABLE_PORTS = ports.map(p => p.path);

		if (this.config.serialport && this.config.ser2net === false && this.config.gateway === 'usb300' || this.config.gateway === 'fgw14-usb') {
			SERIAL_PORT = new SerialPort({ path: this.config.serialport, baudRate: 57600});

			if (this.config.gateway === 'fgw14-usb') {
				SERIALPORT_PARSER = SERIAL_PORT.pipe(new SERIALPORT_PARSER_CLASS.esp2parser());
			} else {
				SERIALPORT_PARSER = SERIAL_PORT.pipe(new SERIALPORT_PARSER_CLASS.esp3parser());
			}

			await this.packetListenerSerial();
		}

		if (this.config.ser2net === true || this.config.gateway === 'all-smart'){
			this.connectTCP();
		}
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		clearTimeout(timeoutWait);
		clearTimeout(timeoutQueue);
		clearTimeout(timeoutTeachin);
		clearTimeout(timeoutGateway);
		try {
			if (SERIAL_PORT !== null) {
				SERIAL_PORT.close();
			}

			if (tcpClient !== null) {
				tcpClient.destroy();
			}

			this.setState('info.connection', false, true);
			this.log.info('cleaned everything up...');
			callback();
		} catch (e) {
			callback();
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

		if(state) {
			switch (objName) {
				case 'gateway.teachin':
					if (state.val === true && state.ack === false) {
						this.log.info('Teachin mode active');
						await this.setStateAsync(id, {ack: true});
						timeoutTeachin = setTimeout(() => {
							this.setState(id, {val: false, ack: true});
						}, 60 * 1000);
					}
					break;
				case 'gateway.repeater.level': {
					const data = ByteArray.from([0x09, 0x00, 0x00]);
					const mode = await this.getStateAsync('gateway.repeater.mode');
					if (mode !== null && mode !== undefined) {
						data.setValue(mode.val, 8, 8);
						data.setValue(state.val, 16, 8);
						await this.sendData(this, data, null, 5);
					}
					break;
				}
				case 'gateway.repeater.mode': {
					const data = ByteArray.from([0x09, 0x00, 0x00]);
					const level = await this.getStateAsync('gateway.repeater.level');
					if (level !== null && level !== undefined) {
						data.setValue(state.val, 8, 8);
						data.setValue(level.val, 16, 8);
						await this.sendData(this, data, null, 5);
					}
					break;
				}
				case 'development.telegram': {
					if(state.val !== null && state.val !== undefined && state.val !== '') {
						const hex = Buffer.from(state.val.toString(), 'hex');
						await this.parseMessage(hex);
					}
					break;
				}
			}
		}

		if (state && state.ack === false) {

			// The state was changed
			this.log.debug(`state ${objName} changed: ${state.val} (ack = ${state.ack}) state: ${JSON.stringify(state)}`);

			const obj  = await this.getObjectAsync(`${this.namespace}.${tmp[2]}`);
			//const oObj = await this.getObjectAsync(id);

			if(obj && obj.type === 'device' && tmp[2] !== 'gateway'){
				let devId = obj.native.id;
				const eep = obj.native.eep[0]; //returns a object for cases where more than one eep is present
				const eepProfile = EEPList[eep.replace(/-/g, '')];
				const subId = objName.replace(/.*\./g, '');
				const rorg = eepProfile.rorg_number;

				switch(subId){
					case 'CMD': {
						let data = ByteArray.from();
						let send = true;


						for (const c in eepProfile.case) {

							const parameter = [];
							if (eepProfile.case[c].condition && eepProfile.case[c].condition.command && eepProfile.case[c].condition.command[0].value === state.val && eepProfile.case[c].send !== undefined && eepProfile.case[c].send === false) {
								//prevent send data if telegram was received
								send = false;
								break;
								//check if the condition is true
								//then go thru datafields and collect data from profile or get object IDs with corresponding data
							}else if(eepProfile.case[c].condition && eepProfile.case[c].condition.command && eepProfile.case[c].condition.command[0].value === state.val){
								for (const d in eepProfile.case[c].datafield) {
									const datafield = eepProfile.case[c].datafield[d];
									if (datafield.data === 'fixed parameter') {
										const bitoffs = datafield.bitoffs;
										const bitsize = datafield.bitsize;
										data.setValue(datafield.value, bitoffs, bitsize);
									} else {
										parameter.push(datafield.shortcut);
									}

								}
							} else if (!eepProfile.case[c].condition && eepProfile.case[c].send === true ) {
								for (const d in eepProfile.case[c].datafield) {
									const datafield = eepProfile.case[c].datafield[d];
									if (datafield.data === 'fixed parameter') {
										const bitoffs = datafield.bitoffs;
										const bitsize = datafield.bitsize;
										data.setValue(datafield.value, bitoffs, bitsize);
									} else {
										parameter.push(datafield.shortcut);
									}

								}

							}

							//get data from objects
							for (const s in parameter) {
								const state = await this.getStateAsync(`${this.namespace}.${devId}.${parameter[s]}`);
								await this.setState(`${this.namespace}.${devId}.${parameter[s]}`, {ack: true});
								const short = parameter[s];
								const datafield = eepProfile.case[c].datafield;
								for (const d in datafield) {
									if (state !== null && state !== undefined && datafield[d].shortcut === short && datafield[d].bitoffs !== null && datafield[d].bitsize !== null && (!datafield[d].condition || !datafield[d].condition[0].value === state.val) ) {
										const bitoffs = datafield[d].bitoffs;
										const bitsize = datafield[d].bitsize;
										const value = state.val;
										//Check if there is a converion needed
										if(datafield[d].value_out) {
											const convertedValue = jsonLogic.apply(datafield[d].value_out, {'value': value});
											data.setValue(parseInt(convertedValue), bitoffs, bitsize);
										} else if (value) {
											data.setValue(value, bitoffs, bitsize);
										}
										break;
									} else if (datafield[d].shortcut === short && datafield[d].bitoffs !== null && datafield[d].bitsize !== null && datafield[d].value !== null) {
										const bitoffs = datafield[d].bitoffs;
										const bitsize = datafield[d].bitsize;
										const value = datafield[d].value;
										data.setValue(value, bitoffs, bitsize);
									}
								}
							}
						}
						if(send === false || !data){
							break;
						}

						const subTelNum = [0x00];
						if(obj.native.broadcast){
							devId = 'ffffffff';
						}
						const tempId = devId.toUpperCase().match(/.{1,2}/g);
						const receiverID = [];
						for(const b in tempId) {
							// receiverID.push('0x' + tempId[b]);
							receiverID.push(parseInt(tempId[b], 16));
						}
						const gateway = await this.getObjectAsync('gateway');
						let baseID = gateway.native.BaseID;

						if (obj.native.baseIDoffset) {
							baseID = obj.native.Sender_ID;
						}
						baseID = ByteArray.from(baseID.match(/.{1,2}/g));

						const optionalData = subTelNum.concat(receiverID, [0xFF, 0x00]);
						let type, finalData;
						switch (rorg) {

							case '0xD2':
								type = [0xD2];
								finalData = type.concat(data, baseID, [0x00]);
								break;
							case '0xA5':
								type = [0xA5];
								if (data.length > 4 || data.length < 4) {
									this.log.warn(`The data length for a 4BS telegram is incorrect. The length is ${data.length}`);
								}
								finalData = type.concat(data, baseID, [0x00]);
								break;
							case '0xF6':
								type = [0xF6];
								if (data.length > 1 || data.length < 1) {
									this.log.warn(`The data length for a RPS telegram is incorrect. The length is ${data.length}`);
								}
								finalData = type.concat(data, baseID, [0x30]);
								break;
							case '0xD5':
								type = [0xD5];
								if (data.length > 1 || data.length < 1) {
									this.log.warn(`The data length for a 1BS telegram is incorrect. The length is ${data.length}`);
								}
								finalData = type.concat(data, baseID, [0x00]);
								break;
						}

						this.queue.push({'data': finalData, 'optionaldata': optionalData, 'packettype': 0x01});

						await this.setStateAsync(id, {ack: true});
						break;
					}
				}
			}
		} else if (!state) {
			// The state was deleted
			if (objName === 'gateway.teachin'){
				this.log.info('Teachin mode de-activated');
				await this.setStateAsync(id, {val: false, ack: true});
			}
			this.log.info(`state ${id} deleted`);
		}
	}

	/**
	 * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	 * Using this method requires "common.message" property to be set to true in io-package.json
	 * @param {ioBroker.Message} obj
	 */
	async onMessage(obj) {

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
				teachinMethod = {teachinMethod: Codes.telegram_type[obj.message.teachin_method], name: obj.message.device, mfr: obj.message.mfr};
				this.setState('gateway.teachin', {val: true, ack: true});
				timeoutTeachin = setTimeout(() => {
					this.setState('gateway.teachin', {val: false, ack: true});
				}, 60 * 1000);
				if(teachinMethod.teachinMethod === 'C6'){
					await this.makeControllerPostmaster();
					await this.enableSmartACKteachin();
				}
				respond({ error: null, result: 'Ready' }, this);
				break;
			case 'newDevice':
				new this.predifnedDeviceTeachIn(this, obj.message.device, obj.message.mfr, obj.message.id);
				respond({ error: null, result: 'Ready' }, this);
				break;
			case 'deleteDevice':{
				// remove namespace from id
				const id = obj.message.replace(this.namespace + '.', '');
				await this.deleteDeviceAsync(id);
				break;
			}
			case 'getDevices': {
				const devices = require('./lib/definitions/devices.json');
				respond(devices, this);
				break;
			}
			case 'setEEPs': {
				await this.extendObjectAsync(obj.message.id, {
					'native': {
						eep: obj.message.eep
					}
				});
				break;
			}
			case 'getSystemInfo': {
				const systemInfo = await this.collectSystemInformation();
				respond(systemInfo, this);
			}

		}
	}

	// filter serial devices function filterSerialPorts(path) {
	filterSerialPorts(path) {

		// get only serial port names
		if (!(/(tty(ACM|USB|AMA|MFD|Enocean|enocean|EnOcean|\.usbserial-)|rfcomm|(serial\/by-id))/).test(path)) return false;

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
			const byIdDirName = '/dev/serial/by-id';

			let ports, byId;
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

			try {
				byId = fs
					.readdirSync(byIdDirName)
					.map(function (file) {
						return path.join(byIdDirName, file);
					})
					.filter(this.filterSerialPorts)
					.map(function (port) {
						return { path: port };
					});
			} catch (e) {
				this.log.error('Cannot read "' + devDirName + '": ' + e);
			}
			for(const i in byId){
				ports.push(byId[i]);
			}
			result = ports.map(p => p.path);
		} else if (PLATFORM === 'win32') {
			result = AVAILABLE_PORTS;
		}
		return result;
	}

	async connectTCP(){
		try {
			tcpClient = new net.Socket();
			await this.socketConnectAsync(this.config['ser2net-port'], this.config['ser2net-ip']);
			if (this.config.gateway === 'fgw14-usb') {
				SERIALPORT_PARSER = tcpClient.pipe(new SERIALPORT_PARSER_CLASS.esp2parser());
			} else {
				SERIALPORT_PARSER = tcpClient.pipe(new SERIALPORT_PARSER_CLASS.esp3parser());
			}
			tcpReconnectCounter = 0;
			await this.packetListenerTCP();
		} catch (error) {
			this.log.warn('Can not connect to host: ' + error);
		}
	}

	async packetListenerSerial() {
		//open serial port, set adapter state to connected and wait for messages
		SERIAL_PORT.on('open', async () => {
			if(this.config.gateway !== 'fgw14-usb') {
				const connected = await this.getGatewayInfo();
				if (connected === true) {
					this.setState('info.connection', {val: true, ack: true});
				}

				await this.extractSenderIdFromDevices();
				//Not supported by USB300 await this.deleteSmartACKMailbox();
				//await this.resetSmartACKClient();
				//Not supported by USB300 await this.readMailboxStatus();
			} else {
				await this.dummyGatewayInfo();
				this.setState('info.connection', {val: true, ack: true});
			}

			this.sendQueue();

			SERIALPORT_PARSER.on('data', async (data) => {
				this.log.debug(data.toString('hex'));
				try {
					await this.parseMessage(data);
				} catch (error) {
					this.log.error(error);
				}
			});
		});


		//listen to error messages from serial port
		SERIAL_PORT.on('error', (err) => {
			this.log.warn('An error occured at serial port: ' + err);
		});

		//listen to close serial port
		SERIAL_PORT.on('close', () => {
			this.log.info('The serial port was closed.');
			this.setState('info.connection', {val: false, ack: true});
		});

	}

	async packetListenerTCP() {
		if(this.config.gateway !== 'fgw14-usb') {
			const connected = await this.getGatewayInfo();
			if (connected === true) {
				this.setState('info.connection', {val: true, ack: true});
			}

			await this.extractSenderIdFromDevices();
		} else {
			await this.dummyGatewayInfo();
			this.setState('info.connection', {val: true, ack: true});
		}

		this.sendQueue();

		SERIALPORT_PARSER.on('data', async (data) => {
			this.log.debug(data.toString('hex'));
			try {
				await this.parseMessage(data);
			} catch (error) {
				this.log.error(error);
			}
		});


		tcpClient.on('error', (err) => {
			this.log.warn('An error occured at TCP port: ' + err);
		});

		tcpClient.on('close', async () => {
			this.log.info('The TCP port was closed.');
			this.setState('info.connection', {val: false, ack: true});
			if(tcpReconnectCounter === 0) {
				this.reconnectTCP();
			}

		});

	}

	async reconnectTCP(){
		if (tcpReconnectCounter <= 30){
			tcpReconnectCounter += 1;
			await this.wait(60);
			this.log.info('Trying to reconnect. Attempt no. ' + tcpReconnectCounter);
			this.connectTCP();
		}

	}

	/**
	 * Parses a data package from the ESP3 serial interface
	 * @param {Buffer} data The received data
	 */
	async parseMessage(data) {
		const esp3packet = new ESP3Packet(data);

		switch (esp3packet.type) {
			case 1: // RADIO_ERP1
			{
				const teachin = await this.getStateAsync(this.namespace + '.gateway.teachin');

				if (teachin) {
					if (teachin.val === false) {
						const telegram = new HandleType1(this, esp3packet);
						await this.setStateAsync('gateway.lastID', {val: telegram.senderID, ack: true});
					} else if (teachin.val === true && teachinMethod !== null) {
						const telegram = new RadioTelegram(esp3packet);
						await this.setStateAsync('gateway.lastID', {val: telegram.senderID, ack: true});
						if (teachinMethod.teachinMethod === 'UTE' && telegram.type.toString(16) === 'd4') {
							new HandleTeachIn(this, esp3packet, teachinMethod);
							// teachinMethod = null;
						}else if (telegram.type.toString(16) === teachinMethod.teachinMethod.toLowerCase()){
							new HandleTeachIn(this, esp3packet, teachinMethod);
							if(telegram.type.toString(16) !== 'd1'){
								// teachinMethod = null;
							}
						}
					}
				}

				break;
			}
			case 2: //RESPONSE
			{
				const telegram = new HandleType2(this, data);
				this.log.debug('Packet type 2 received: ' + JSON.stringify(telegram.main));
				break;
			}
			case 3: //RADIO_SUB_TEL
			{//this.log.debug('Radio sub telegram received.');
				const teachin = await this.getStateAsync(this.namespace + '.gateway.teachin');

				if (teachin) {
					if (teachin.val === false) {
						const telegram = new HandleType1(this, esp3packet);
						await this.setStateAsync('gateway.lastID', {val: telegram.senderID, ack: true});
					} else if (teachin.val === true && teachinMethod !== null) {
						const telegram = new RadioTelegram(esp3packet);
						await this.setStateAsync('gateway.lastID', {val: telegram.senderID, ack: true});
						if (teachinMethod.teachinMethod === 'UTE' && telegram.type.toString(16) === 'd4') {
							new HandleTeachIn(this, esp3packet, teachinMethod);
							teachinMethod = null;
						} else if (telegram.type.toString(16) === teachinMethod.teachinMethod.toLowerCase()) {
							new HandleTeachIn(this, esp3packet, teachinMethod);
							if (telegram.type.toString(16) !== 'd1') {
								teachinMethod = null;
							}
						}
					}
				}
				break;
			}
			case 4: //EVENT
				this.log.debug('Event message received.');
				new HandleType4(this, esp3packet, teachinMethod);
				teachinMethod = null;
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
			case 10: {//RADIO_ERP2
				const teachin = await this.getStateAsync(this.namespace + '.gateway.teachin');
				if (teachin) {
					if (teachin.val === false){
						const telegram = new HandleType10(this, esp3packet);
						await this.setStateAsync('gateway.lastID', {val: telegram.senderID, ack: true});
					} else {
						if (teachinMethod !== null) {
							const telegram = new HandleTeachIn(this, esp3packet, teachinMethod);
							await this.setStateAsync('gateway.lastID', {val: telegram.senderID, ack: true});
						}
					}
				}
				this.log.debug('ERP2 protocol radio telegram received.');
				break;
			}
			case 16: //RADIO_802_15_4
				this.log.debug('802_15_4_RAW Packet received.');
				break;
			case 17: //COMMAND_2_4
				this.log.debug('2.4 GHz Command received.');
				break;
			default:
				this.log.debug('Packet type ' + toHex(ESP3Packet.type) + ' has been received, but is not handled.');
				break;
		}
	}

	async extractSenderIdFromDevices() {
		const devices = await this.getDevicesAsync();
		const gateway = await this.getObjectAsync('gateway');
		const senderIDs = gateway.native.senderIDs;

		for (const d in devices) {
			const patt = new RegExp('gateway');
			if(!patt.test(devices[d]._id) && devices[d].native.Sender_ID) {
				senderIDs[devices[d].native.Sender_ID] = devices[d].native.id;
			}
		}

		await this.extendObjectAsync('gateway', {
			native: {
				senderIDs: senderIDs
			}
		});
	}

	// Create a dummy Gateway for Eltako FGW14
	async dummyGatewayInfo() {
		const gatewayObject = {
			native: {
				BaseID: '00010000', // As per Eltako documentation in BR14-SPS-PC-Anbindung.pdf page 2
				Frequency: '868.3 Mhz',
				Protocol: 'ESP2',
				AppVersion: `1.0.0.0`,
				ApiVersion: `1.0.0.0`,
				ChipID: '00000001',
				ChipVersion: '00000001',
				AppDescription: 'Eltako RS485 Bus Gateway'
			}
		};

		const senderIDs = await idRangeCalc('00010000');

		const gateway = await this.getObjectAsync('gateway');

		if(!gateway.native.senderIDs) {
			gatewayObject.native.senderIDs = senderIDs;
			await this.extendObjectAsync('gateway', gatewayObject);
		}

	}

	async getGatewayInfo(){
		let data, appVersion_main, appVersion_beta, appVersion_alpha, appVersion_build, apiVersion_main, apiVersion_beta, apiVersion_alpha, apiVersion_build, chipId, chipVersion, appDescription, repEnable, repLevel, frequency, protocol, baseId;
		let senderIDs = {};
		let connected = false;
		//03: CO_RD_VERSION
		data = Buffer.from([0x03]);
		const rd_version = await this.sendData(this, data, null, 5);
		if(rd_version === true){
			try {
				const returnVersion = await this.waitForResponse('Get version information', 33);
				appVersion_main = parseInt(returnVersion.slice(7, 8).toString('hex'), 16);
				appVersion_beta = parseInt(returnVersion.slice(8, 9).toString('hex'), 16);
				appVersion_alpha = parseInt(returnVersion.slice(9, 10).toString('hex'), 16);
				appVersion_build = parseInt(returnVersion.slice(10, 11).toString('hex'), 16);
				apiVersion_main = parseInt(returnVersion.slice(11, 12).toString('hex'), 16);
				apiVersion_beta = parseInt(returnVersion.slice(12, 13).toString('hex'), 16);
				apiVersion_alpha = parseInt(returnVersion.slice(13, 14).toString('hex'), 16);
				apiVersion_build = parseInt(returnVersion.slice(14, 15).toString('hex'), 16);
				chipId = returnVersion.slice(15, 19).toString('hex');
				chipVersion = returnVersion.slice(19, 23).toString('hex');
				appDescription = returnVersion.slice(23, 39).toString('utf8').replace(/\u0000/g, '');

				connected = true;
			} catch (e) {
				this.log.error(e);
			}
		}

		//10: CO_RD_REPEATER
		data = Buffer.from([0x0A]);
		const rd_repeater = await this.sendData(this, data, null, 5);
		if(rd_repeater === true){
			try {
				const returnRepeater = await this.waitForResponse('Get repeater mode and level', 3);
				repEnable = returnRepeater.slice(7, 8);
				repLevel = returnRepeater.slice(8, 9);
				await this.setStateAsync('gateway.repeater.level', {val: repLevel[0], ack: true});
				await this.setStateAsync('gateway.repeater.mode', {val: repEnable[0], ack: true});

				connected = true;
			} catch (e) {
				this.log.error(e);
			}
		}

		//37: CO_GET_FREQUENCY_INFO
		data = Buffer.from([0x25]);
		const get_frequency = await this.sendData(this, data, null, 5);
		if(get_frequency === true){
			try {
				const returnFrequency = await this.waitForResponse('Get frequency', 3);
				frequency = '0x' + returnFrequency.slice(7, 8).toString('hex');
				protocol = '0x' + returnFrequency.slice(8, 9).toString('hex');

				connected = true;
			} catch (e) {
				this.log.error(e);
			}
		}

		//08: CO_RD_IDBASE
		data = Buffer.from([0x08]);
		const rd_idbase = await this.sendData(this, data, null, 5);
		if(rd_idbase === true){
			try {
				const returnIdbase = await this.waitForResponse('Get base ID', 5);
				const telegram = new ResponseTelegram(returnIdbase);
				baseId = telegram.data.toString('hex');
				senderIDs = await idRangeCalc(baseId);

				connected = true;
			} catch (e) {
				this.log.error(e);
			}
		}

		//Smart ACK 06: SA_RD_LEARNDCLIENTS
		data = Buffer.from([0x06]);
		const sa_rd_learndclients = await this.sendData(this, data, null, 6);
		if(sa_rd_learndclients === true){
			try {
				const returnSaRdLearndclients = await this.waitForResponse('Read learnd devices', null);
				const telegram = new HandleType2(this, returnSaRdLearndclients);
				//baseId = telegram.data.toString('hex');
				const resData = telegram.main.data;
				//console.log( (resData.length / 2)/9 );
				//console.log(resData);+
				if(resData !== undefined){
					const mailboxes = [];
					for(let i = 0; i < (resData.length / 2)/9; i++){
						const mailbox = {};
						//TODO: split string into mailbox objects and show in?

					}
				}

				connected = true;
			} catch (e) {
				this.log.error(e);
			}
		}

		//TODO: Read Gateway information from old gateways, split into separate function. Does not work with FGW14.
		/*data = Buffer.from([0x8B, 0x89, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
		const gw_info = await this.sendData(this, data, null, 5);
		try {
			const info = await this.waitForResponse('Read gateway info');
			console.log(info);
		} catch (e) {
			this.log.error(e);
		}*/

		const gatewayObject = {
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
		};

		this.log.info(JSON.stringify(gatewayObject.native));

		await this.extendObjectAsync('gateway', gatewayObject);

		const gateway = await this.getObjectAsync('gateway');

		if(!gateway.native.senderIDs) {
			await this.extendObjectAsync('gateway', {
				native: {
					senderIDs: senderIDs
				}
			});
		}

		return connected;
	}

	async resetController(){
		const data = Buffer.from([0x02]);
		await this.sendData(this, data, null, 5);
		const response = await this.waitForResponse();
		const telegram = new HandleType2(this, response);
		console.log(`Reset controller: ${JSON.stringify(telegram.main)}`);
	}

	async enableTransparentMode(){
		const data = Buffer.from([0x3e, 0x01]);
		await this.sendData(this, data, null, 5);
		const response = await this.waitForResponse();
		const telegram = new HandleType2(this, response);
		console.log(`Enable Transparent Mode: ${JSON.stringify(telegram.main)}`);
	}

	async enableSmartACKteachin(){
		const data = Buffer.from([0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00]);
		await this.sendData(this, data, null, 6);
		const response = await this.waitForResponse();
		const telegram = new HandleType2(this, response);
		console.log(`Smart ACK teach-in enabled: ${JSON.stringify(telegram.main)}`);
	}

	async readMailboxStatus(){
		const data = Buffer.from([0x09, 0x05, 0x96, 0x1d, 0x4f, 0x01, 0x9d, 0x45, 0x44]);
		await this.sendData(this, data, null, 6);
		const response = await this.waitForResponse();
		const telegram = new HandleType2(this, response);
		console.log(`Read mailbox status: ${JSON.stringify(telegram.main)}`);
	}

	async resetSmartACKClient(){
		const data = Buffer.from([0x05, 0x05, 0x96, 0x1d, 0x4f]);
		await this.sendData(this, data, null, 6);
		const response = await this.waitForResponse();
		const telegram = new HandleType2(this, response);
		console.log(`Reset Smart ACK client: ${JSON.stringify(telegram.main)}`);
	}

	//Delete Mailbox on Controller - On USB300 not supported?
	async deleteSmartACKMailbox(){
		const data = Buffer.from([0x0a, 0x05, 0x83, 0x4b, 0x83, 0x01, 0x9d, 0x45, 0x44]);
		await this.sendData(this, data, null, 6);
		const response = await this.waitForResponse();
		const telegram = new HandleType2(this, response);
		console.log(`Delet Smart ACK mailbox: ${JSON.stringify(telegram.main)}`);
	}

	async makeControllerPostmaster(){
		const data = Buffer.from([0x08, 0x14]);
		await this.sendData(this, data, null, 6);
		const response = await this.waitForResponse();
		const telegram = new HandleType2(this, response);
		console.log(`Make controller postmaster: ${JSON.stringify(telegram.main)}`);
	}

	/**
	 * Collect systeminformation for the enocean adapter
	 * @returns {Promise<object>}
	 */
	async collectSystemInformation() {
		// Get all device objects
		const devices = await this.getDevicesAsync();
		for(const i in devices) {
			delete devices[i].user;
			delete devices[i].acl;
			delete devices[i].from;
			delete devices[i].ts;
			// @ts-ignore
			delete devices[i].type;
			// @ts-ignore
			delete devices[i].common;
		}

		// Get system.adapter.enocean.0 object
		const instance = await this.getForeignObjectAsync(`system.adapter.enocean.${this.instance}`);
		const instanceInfo = {
			native: instance.native,
			version: instance.common.installedVersion,
			installedFrom: instance.common.installedFrom
		};

		return {
			nodeVersion: process.version,
			serialDevices: this.listSerial(),
			instance: instanceInfo,
			devices: devices
		};
	}

	//wait for response from USB Stick/Modul
	waitForResponse(info, responseLength){
		info = info ? ': ' + info : '';
		return new Promise((resolve, reject) => {
			const cb = (data) => {
				//this.log.info(data.toString('hex'));
				const telegram = new ESP3Packet(data);
				if(responseLength === telegram.dataLength || responseLength === null){
					resolve(data);
					clearTimeout(timeoutGateway);
					SERIALPORT_PARSER.off('data', cb);
				}
			};
			SERIALPORT_PARSER.on('data', cb);
			timeoutGateway = setTimeout(() => {reject('Timeout for response' + info);}, 1500);
		});
	}

	/**
	 *
	 * @param {number} time
	 * @returns {Promise<boolean>}
	 */
	wait(time){
		return new Promise( (resolve) => {
			timeoutWait = setTimeout( () => {
				resolve(true);
			}, time *  1000);
		});
	}

	/**
	 * Checks whether the given string is in hexadecimal format and exactly 8 characters long.
	 * @param {string} str - The string to check.
	 * @returns {boolean} - `true` if the string is in hexadecimal format and exactly 8 characters long, otherwise `false`.
	 */
	isValidHex(str) {
		const regex = /^[0-9A-Fa-f]{8}$/;
		return regex.test(str);
	}

	socketConnectAsync(port, ip){
		return new Promise((resolve) => {
			const cb = () => {
				tcpClient.setKeepAlive(true, 2500);
				resolve(true);
			};
			const connection = tcpClient.connect(port, ip, cb);
			connection.on('error', (err) => {
				this.log.warn(`${err}`);
				this.reconnectTCP();
			});
			connection.pipe(process.stdout);
		});
	}

	async sendQueue(){
		if(this.queue.length > 0){
			const data = this.queue[0].data;
			const optionalData = this.queue[0].optionaldata;
			const packetType = this.queue[0].packettype;
			await this.sendData(this, data, optionalData, packetType);
			this.queue.splice(0,1);
		}
		timeoutQueue = setTimeout( () => {
			this.sendQueue();
		}, 50);
	}

	/**
	 *
	 * @param {object} that
	 * @param {array|ByteArray} data
	 * @param {array} optionalData
	 * @param {number} packetType
	 * @returns {Promise<boolean>}
	 */
	async sendData(that, data, optionalData, packetType){
		let payload;
		if(that.config.gateway === 'fgw14-usb') {
			const sync = Buffer.from([0xa5, 0x5a]);
			const header = Buffer.from([0x6b]) ;


			const arrData = [...data];
			switch(arrData[0]) {
				case 0xA5:
					arrData.splice(0, 1, 0x07);
					break;
				case 0xF6:
					arrData.splice(0, 1, 0x05);
					break;
				case 0xD5:
					arrData.splice(0, 1, 0x06);
					break;
			}

			for(let i = 0; i < arrData.length; i++) {
				if(arrData[i] === undefined){
					arrData.splice(i, 1, 0x00);
				}
			}

			const buf = Buffer.concat([header, Buffer.from(arrData)]);
			const crc = crcESP2(buf);

			payload = [sync, header, Buffer.from(arrData), Buffer.from([crc])];

		} else {
			const sync = Buffer.from([0x55]);
			const dataLenHex = dec2hexString(data.length);
			const header = Buffer.from(['0x' + dataLenHex.substring(1, 2), '0x' + dataLenHex.substring(3, 4), optionalData !== null ? 0x07 : 0x00, packetType.toString(16)]);
			const crc8h = Buffer.from([CRC8.calcCrc8(header)]);
			const crc8d = Buffer.from([CRC8.calcCrc8(optionalData !== null ? data.concat(optionalData) : data)]);


			if (optionalData !== null) {
				payload = [sync, header, crc8h, Buffer.from(data), Buffer.from(optionalData), crc8d];
			} else {
				payload = [sync, header, crc8h, Buffer.from(data), crc8d];
			}
		}


		if (that.config.ser2net === false && that.config.gateway !== 'all-smart') {
			SERIAL_PORT.write(Buffer.concat(payload), (err) => {
				if (err) {
					that.log.warn('Error sending data: ' + err);
					return false;
				}
				that.log.debug('Sent data: ' + Buffer.concat(payload).toString('hex'));
			});
		} else {
			tcpClient.write(Buffer.concat(payload), (err) => {
				if (err) {
					that.log.warn('Error sending data: ' + err);
					return false;
				}
				that.log.debug('Sent data: ' + Buffer.concat(payload).toString('hex'));
			});
		}
		//const resWrite = await this.writeAsync(Buffer.concat(payload));
		//this.log.info(resWrite);
		//this.log.debug('Sent data: ' + Buffer.concat(payload).toString('hex'));

		/*const res = await this.waitForResponse();
		this.log.info('Hier res');
		const retCode = new ResponseTelegram(res);

		switch(retCode.returnCode.toString('hex')) {
			case '00':
				this.log.debug('Data dispatch confirmed');
				break;
			case '01':
				this.log.debug('Error send data');
				break;
			case '02':
				this.log.debug('Not Supported');
				break;
			case '03':
				this.log.debug('Wrong Parameter');
				break;
			case '04':
				this.log.debug('Operation Denied');
				break;
			case '05':
				this.log.debug('Duty cycle lock');
				break;
			case '06':
				this.log.debug('Internal Buffer too small to handle this telegram');
				break;
			case '07':
				this.log.debug('Currently all internal buffers are used.');
				break;
		}*/

		return true;
	}
}


// convert byte to hex
function toHex(byte) {
	return ('0' + (byte & 0xFF).toString(16)).slice(-2);
}

/**
 *
 * @param {number} dec
 * @returns {string}
 */
function dec2hexString(dec) {
	return (dec+0x10000).toString(16).substr(-4).toUpperCase();
}

/**
 * Calculate available sender IDs and return a json object
 * @param {string} baseId
 * @returns {Promise<{}>} sender ID list as json
 */
async function idRangeCalc(baseId) {
	const baseInt = parseInt(baseId, 16);
	const result = {};

	for (let i = 1; i < 127; i++) {
		const idInt = baseInt + i;
		let idHex = idInt.toString(16);
		// If idHex is not 8 characters long, add leading zeros
		idHex = idHex.length < 8 ? '0'.repeat(8 - idHex.length) + idHex : idHex;
		result[idHex] = '';
	}
	return result;
}

function crcESP2(buf) {
	let result = 0;
	for (let index = 0; index < buf.length; index++) {
		result = (result + buf[index]);
	}
	result = result & 0xff;
	return result;
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
