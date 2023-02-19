const dmUtils = require('dm-utils');

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
		this.adapter.log.info(`New device button was pressed`);
		return { refresh: true };
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
						icon: 'fas fa-trash-alt',
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