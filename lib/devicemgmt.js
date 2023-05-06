const dmUtils = require('dm-utils');
const devices = require('./definitions/devices.json');
const {predifnedDeviceTeachin: predifnedDeviceTeachIn} = require('./tools/Packet_handler');

class dmEnocean extends dmUtils.DeviceManagement {

	async getInstanceInfo() {
		const data = {
			...super.getInstanceInfo(),
			actions: [
				{
					id: 'refresh',
					icon: 'fas fa-redo-alt',
					title: '',
					description: 'Refresh device list',
					handler: this.handleRefresh.bind(this)
				},
				{
					id: 'newDevice',
					icon: 'fas fa-plus',
					title: 'New Device',
					description: 'Add new device to EnOcean',
					handler: this.handleNewDevice.bind(this)
				}
			],
		};
		this.adapter.log.debug(`Send instance information: ${JSON.stringify(data)}`);
		return data;
	}

	async handleRefresh(_context) {
		return { refresh: true };
	}

	async handleNewDevice(_context) {
		// Get all manufucturers from devices.json, they are the first key in the object
		const manufacturers = Object.keys(devices);
		const manufacturerOptions = [];
		for (const i in manufacturers) {
			manufacturerOptions.push({
				label: manufacturers[i].replace(/_/g, ' '),
				value: manufacturers[i]
			});
		}

		// Show first form to select manufacturer
		const manufacturer = await _context.showForm({
			type : 'panel',
			items: {
				manufacturer: {
					type: 'select',
					options: manufacturerOptions
				}
			}
		}, {
			data: {
				manufacturer: ''
			},
			title: 'Choose manufacturer',
		});

		if(!manufacturer && manufacturer !== undefined) {
			await _context.showMessage('Error occurred: No manufacturer selected');
			return { refresh: false };
		} else if(manufacturer === undefined) {
			return { refresh: false };
		}

		// Get all devices of the selected manufacturer
		const devicesOfManufacturer = devices[manufacturer.manufacturer];
		const deviceOptions = [];
		for (const i in devicesOfManufacturer) {
			if(devicesOfManufacturer[i].deviceManager === undefined) {
				continue;
			}
			deviceOptions.push({
				label: i,
				value: i
			});
		}

		// Show second form to select device
		const device = await _context.showForm({
			type : 'panel',
			items: {
				device: {
					type: 'autocomplete',
					options: deviceOptions
				}
			}}, {
			data: {
				device: ''
			},
			title: 'Choose device'
		});

		if(!device && device !== undefined) {
			await _context.showMessage('Error occurred: No device selected');
			return { refresh: false };
		} else if(device === undefined) {
			return { refresh: false };
		}

		const deviceDefinition = devices[manufacturer.manufacturer][device.device];

		let lang = this.adapter.systemConfig.language;

		let deviceId = null;

		for (const i in deviceDefinition.deviceManager) {
			if(typeof deviceDefinition.deviceManager[i] === 'string' && deviceDefinition.deviceManager[i] === '#enterDeviceId') {
				deviceId = await this.waitForValidDeviceId(_context);
				if(deviceId === null) {
					return { refresh: false };
				}
			}

			if(typeof deviceDefinition.deviceManager[i] === 'string' && deviceDefinition.deviceManager[i] === '#EltakoSeries14enterDeviceId') {
				deviceId = await this.EltakoSeries14waitForValidDeviceId(_context);
				if(deviceId === null) {
					return { refresh: false };
				}
			}

			if(typeof deviceDefinition.deviceManager[i] === 'string' && deviceDefinition.deviceManager[i] === '#addDevicePredefined') {
				new predifnedDeviceTeachIn(this.adapter, device.device, manufacturer.manufacturer, deviceId.deviceId);
			}

			// Check if the deviceManager entry is a string and includes '#setState'
			if(typeof deviceDefinition.deviceManager[i] === 'string' && deviceDefinition.deviceManager[i].includes('#setState')) {
				const json = JSON.parse( deviceDefinition.deviceManager[i].match(/{.*}/) );
				for (const key in json) {
					this.adapter.setState(key, json[key], true);
				}

			}

			if(typeof deviceDefinition.deviceManager[i] === 'object' && deviceDefinition.deviceManager[i].choice === undefined) {
				if(deviceDefinition.deviceManager[i][lang] === undefined) {
					lang = 'en';
				}
				await _context.showMessage(deviceDefinition.deviceManager[i][lang]);
			}

			if(typeof deviceDefinition.deviceManager[i] === 'object' && deviceDefinition.deviceManager[i].choice !== undefined) {
				let items = {};
				for(const j in deviceDefinition.deviceManager[i].choice) {
					const choiceElement = deviceDefinition.deviceManager[i].choice[j];
					// Get the number of key in items
					const itemsLength = Object.keys(items).length;
					if(itemsLength > 0) {
						items.or = {
							type: 'staticText',
							style: {fontWeight: 'bold'},
							newLine: true,
							label: {
								en: 'or',
								de: 'oder',
							}
						};
					}
					for(const step in choiceElement[lang]) {
						items[`${j}_${step}`] = {
							type: 'staticText',
							label: choiceElement[lang][step],
							newLine: true
						};

					}

				}
				const choice = await _context.showForm({
					type : 'panel',
					items: items
				},
				{
					data: {
						choice: ''
					},
					title: deviceDefinition.deviceManager[i].label[lang]
				});
				// TODO: Select with change direct the text, look at ELTAKO FDG14
				if(choice === undefined) {
					return { refresh: false };
				}

			}
		}

		return { refresh: true };
	}

	async waitForValidDeviceId(context) {
		let deviceId = null;
		while (!deviceId) {
			deviceId = await this.formDeviceId(context);
			this.adapter.log.info(JSON.stringify(deviceId));
			if (!deviceId && deviceId !== undefined) {
				await context.showMessage('Error occurred: No device ID entered');
			} else if (this.adapter.isValidHex(deviceId.deviceId) === false) {
				await context.showMessage('Error occurred: Device ID is not valid');
				deviceId = null;
			} else if(deviceId === undefined) {
				return null;
			}
		}
		return deviceId;
	}

	async formDeviceId(_context) {
		return await _context.showForm({
			type : 'panel',
			items: {
				deviceId: {
					type: 'text',
					maxLength: 8,
					placeholder: 'ffffffff',
					help: 'Enter device ID in hex format (8 characters)'
				}
			}}, {
			data: {
				deviceId: ''
			},
			title: 'Enter device ID'
		});
	}

	async EltakoSeries14waitForValidDeviceId(context) {
		let deviceId = null;
		while (!deviceId) {
			const busId = await this.EltakoSeries14formDeviceId(context);
			// Get gateway object
			const gateway = await this.adapter.getObjectAsync(`${this.adapter.namespace}.gateway`);
			const baseId = gateway.native.BaseID;

			if(busId !== undefined) {
				deviceId = {
					deviceId: (parseInt(baseId, 16) + parseInt(busId.busId, 10)).toString(16)
				};
			}
			this.adapter.log.info(JSON.stringify(deviceId));
			if (!deviceId && busId !== undefined) {
				await context.showMessage('Error occurred: No device ID entered');
			} else if (this.adapter.isValidHex(deviceId.deviceId) === false) {
				await context.showMessage('Error occurred: Device ID is not valid');
				deviceId = null;
			} else if(busId === undefined) {
				return null;
			}
		}
		return deviceId;
	}

	async EltakoSeries14formDeviceId(_context) {
		return await _context.showForm({
			type : 'panel',
			items: {
				busId: {
					type: 'text',
					maxLength: 3,
					placeholder: '1',
					help: 'Enter RS485-Bus ID for the device.'
				}
			}}, {
			data: {
				busId: ''
			},
			title: 'Enter Bus ID'
		});
	}

	async listDevices() {
		//this.adapter.log.info('listDevices');
		const devices = await this.adapter.getDevicesAsync();
		let arrDevices = [];
		for (const i in devices) {
			const res = {
				id: devices[i]._id,
				name: devices[i].common.name,
				hasDetails: true,
				actions: [
					{
						id: 'delete',
						icon: 'fa-solid fa-trash-can',
						description: 'Delete this device.',
						handler: this.handleDeleteDevice.bind(this)
					}
				]
			};
			// if id contains gateway remove res.actions
			if(devices[i]._id.includes('gateway')) {
				res.actions = [];
			}
			arrDevices.push(res);
		}
		return arrDevices;
	}

	async getDeviceDetails(_context) {
		const devices = await this.adapter.getDevicesAsync(_context);
		const device = devices.find(d => d._id === _context);
		if(!device) {
			return {error: 'Device not found'};
		}
		const data = {
			id: device._id,
			schema: {
				type: 'panel',
				items: {
					id: {
						type: 'staticText',
						text: device.native.id ?  `ID: ${device.native.id.toUpperCase()}` : `ID: ${device.native.BaseID.toUpperCase()}`
					},
					senderId: {
						type: 'staticText',
						text: device.native.Sender_ID ?  `Sender ID: ${device.native.Sender_ID.toUpperCase()}` : ``
					},
					manufacturer: {
						type: 'staticText',
						text: device.native.manufacturer ? `Manufacturer: ${device.native.manufacturer}` : ''
					},
					name: {
						type: 'staticText',
						text: device.native.name ? `Model: ${device.native.name}` : ''
					}
				}
			}

		};

		return data;
	}

	async handleDeleteDevice(_context) {
		this.log.info(_context);

		// Remove namespace from context
		const name = _context.replace(/enocean\.\d\./, '');
		// delete device
		const res = await this.adapter.deleteDeviceAsync(name);
		if(!res.err) {
			this.adapter.log.info(`${name} deleted`);
			return {refresh: true};
		} else {
			this.adapter.log.error(`Delete device ${name}: ${JSON.stringify(res)}`);
			return {refresh: false};
		}
	}

}

module.exports = dmEnocean;