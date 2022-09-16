// This class updates objects if needed
const objectDefinitions = require('../lib/definitions/object_definitions.js').objDef;

class update {
	constructor(adapter) {
		this.adapter = adapter;
		this.main();
	}

	async main() {
		const devices = await this.adapter.getDevicesAsync();

		for (const device of devices) {
			if (device.common.name !== 'Gateway') {
				// Write device.native.eep to eeps
				const eeps = device.native.eep;
				// For each eep in eeps read the definition from this.adapter.eep
				for (const eep of eeps) {
					const eepDef = this.adapter.eepList[eep.replace(/-/g, '')];
					const objects = eepDef.objects;
					// For each object in objects check if it exists, except preDefined
					for (const object in objects) {
						if (object === 'preDefined') {
							// Check if preDefined objects exist
							for (const preDefinedObject in objects[object]) {
								const objectID = `${device._id}.${objects[object][preDefinedObject]}`;
								const objectExists = await this.adapter.getObjectAsync(objectID);
								if (!objectExists) {
									// Create object
									this.adapter.log.info('Creating object ' + objectID);
									await this.adapter.setObjectAsync(objectID, objectDefinitions[objects[object][preDefinedObject]]);
								}
							}
						} else {
							const objectID = `${device._id}.${object}`;
							const objectExists = await this.adapter.getObjectAsync(objectID);
							// If it does not exist, create it
							if (!objectExists) {
								this.adapter.log.info('Creating object ' + objectID);
								await this.adapter.setObjectNotExistsAsync(objectID, objects[object]);
							}
						}
					}
				}
			}
		}
	}


}

module.exports = update;