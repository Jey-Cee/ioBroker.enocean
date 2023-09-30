const dmUtils = require('@jey-cee/dm-utils');
const devices = require('./definitions/devices.js');
const {predifnedDeviceTeachin: predifnedDeviceTeachIn} = require('./tools/Packet_handler');

class dmEnocean extends dmUtils.DeviceManagement {

	async getInstanceInfo() {
		const data = {
			...super.getInstanceInfo(),
			apiVersion: 'v1',
			actions: [
				{
					id: 'refresh',
					icon: 'fas fa-redo-alt',
					title: '',
					description: {
						en: 'Refresh device list',
						de: 'Geräteliste aktualisieren',
						ru: 'Обновить список устройств',
						pt: 'Atualizar lista de dispositivos',
						nl: 'Vernieuw apparaatlijst',
						fr: 'Actualiser la liste des appareils',
						it: 'Aggiorna elenco dispositivi',
						es: 'Actualizar lista de dispositivos',
						pl: 'Odśwież listę urządzeń',
						'zh-cn': '刷新设备列表',
						uk: 'Оновити список пристроїв'
					},
					handler: this.handleRefresh.bind(this)
				},
				{
					id: 'newDevice',
					icon: 'fas fa-plus',
					title: '',
					description: {
						en: 'Add new device to EnOcean',
						de: 'Neues Gerät zu EnOcean hinzufügen',
						ru: 'Добавить новое устройство в EnOcean',
						pt: 'Adicionar novo dispositivo ao EnOcean',
						nl: 'Voeg nieuw apparaat toe aan EnOcean',
						fr: 'Ajouter un nouvel appareil à EnOcean',
						it: 'Aggiungi nuovo dispositivo a EnOcean',
						es: 'Agregar nuevo dispositivo a EnOcean',
						pl: 'Dodaj nowe urządzenie do EnOcean',
						'zh-cn': '将新设备添加到EnOcean',
						uk: 'Додати новий пристрій до EnOcean'
					},
					handler: this.handleNewDevice.bind(this)
				}
			],
		};
		return data;
	}

	async handleRefresh(context) {
		this.adapter.log.info('handleRefresh');
		return { refresh: true };
	}

	async handleNewDevice(context) {
		this.adapter.log.info('handleNewDevice');
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
		const manufacturer = await context.showForm({
			type : 'panel',
			style: {minWidth: '250px'},
			items: {
				manufacturer: {
					style: {minWidth: '250px'},
					type: 'select',
					options: manufacturerOptions
				}
			}
		}, {
			data: {
				manufacturer: ''
			},
			title: {
				en: 'Choose manufacturer',
				de: 'Hersteller auswählen',
				ru: 'Выберите производителя',
				pt: 'Escolha o fabricante',
				nl: 'Kies een fabrikant',
				fr: 'Choisissez un fabricant',
				it: 'Scegli un produttore',
				es: 'Elige un fabricante',
				pl: 'Wybierz producenta',
				'zh-cn': '选择制造商',
				uk: 'Виберіть виробника'
			},
		});

		if (manufacturer === undefined) {
			return { refresh: false };
		} else if(!manufacturer && manufacturer.manufacturer === '') {
			await context.showMessage('Error occurred: No manufacturer selected');
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
		const device = await context.showForm({
			type : 'panel',
			style: {minWidth: '250px'},
			items: {
				device: {
					style: {minWidth: '250px'},
					type: 'autocomplete',
					options: deviceOptions
				}
			}}, {
			data: {
				device: ''
			},
			title: {
				en: 'Choose device',
				de: 'Gerät auswählen',
				ru: 'Выберите устройство',
				pt: 'Escolha o dispositivo',
				nl: 'Kies een apparaat',
				fr: 'Choisissez un appareil',
				it: 'Scegli un dispositivo',
				es: 'Elige un dispositivo',
				pl: 'Wybierz urządzenie',
				'zh-cn': '选择设备',
				uk: 'Виберіть пристрій'
			}
		});

		if(device === undefined) {
			return { refresh: false };
		} else if(!device && device.device === '') {
			await context.showMessage('Error occurred: No device selected');
			return { refresh: false };
		}

		const deviceDefinition = devices[manufacturer.manufacturer][device.device];

		let lang = this.adapter.systemConfig.language;

		let deviceId = null;

		for (const i in deviceDefinition.deviceManager) {
			// Check if the entered device ID is valid
			if(typeof deviceDefinition.deviceManager[i] === 'string' && deviceDefinition.deviceManager[i] === '#enterDeviceId') {
				deviceId = await this.waitForValidDeviceId(context);
				if(deviceId === null || deviceId === undefined) {
					return { refresh: false };
				}
			}
			// Check if the entered device ID for Eltako series is valid
			if(typeof deviceDefinition.deviceManager[i] === 'string' && deviceDefinition.deviceManager[i] === '#EltakoSeries14enterDeviceId') {
				deviceId = await this.EltakoSeries14waitForValidDeviceId(context);
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
				await context.showMessage(deviceDefinition.deviceManager[i][lang]);
			}

			if(typeof deviceDefinition.deviceManager[i] === 'object' && deviceDefinition.deviceManager[i].choice !== undefined) {
				const items = {};
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
								ru: 'или',
								pt: 'ou',
								nl: 'of',
								fr: 'ou',
								it: 'o',
								es: 'o',
								pl: 'lub',
								'zh-cn': '要么',
								uk: 'або'
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
				const choice = await context.showForm({
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
			if (!deviceId && deviceId !== undefined) {
				await context.showMessage('Error occurred: No device ID entered');
			} else if(deviceId === undefined) {
				return null;
			} else if (this.adapter.isValidHex(deviceId.deviceId) === false) {
				await context.showMessage('Error occurred: Device ID is not valid');
				deviceId = null;
			}
		}
		return deviceId;
	}

	async formDeviceId(context) {
		return await context.showForm({
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

	async EltakoSeries14formDeviceId(context) {
		return await context.showForm({
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
		const devices = await this.adapter.getDevicesAsync();
		const arrDevices = [];
		for (const i in devices) {
			const status = {};
			// Get state rssi from device
			const rssi = await this.adapter.getStateAsync(`${devices[i]._id}.rssi`);
			if(rssi) {
				status.rssi = rssi.val + ' dBm';
			}

			// Find the object that has the role 'indicator.lowbat'
			/*const lowbat = devices[i].native.states.find(s => s.role === 'indicator.lowbat');
			if(lowbat) {
				status.lowbat = lowbat.val;
			}*/

			let hastDetails = false;
			// Check if device has native.Sender_ID
			if(devices[i].native.Sender_ID) {
				hastDetails = true;
			}

			const res = {
				id: devices[i]._id,
				name: devices[i].common.name,
				icon: devices[i].common.icon ? devices[i].common.icon : null,
				manufacturer: devices[i].native.manufacturer ? devices[i].native.manufacturer : null,
				model: devices[i].native.name ? devices[i].native.name : null,
				status: status, // Just for development of device manager
				hasDetails: hastDetails,
				actions: [
					{
						id: 'delete',
						icon: 'fa-solid fa-trash-can',
						description: {
							en: 'Delete this device',
							de: 'Gerät löschen',
							ru: 'Удалить это устройство',
							pt: 'Excluir este dispositivo',
							nl: 'Verwijder dit apparaat',
							fr: 'Supprimer cet appareil',
							it: 'Elimina questo dispositivo',
							es: 'Eliminar este dispositivo',
							pl: 'Usuń to urządzenie',
							'zh-cn': '删除此设备',
							uk: 'Видалити цей пристрій'
						},
						handler: this.handleDeleteDevice.bind(this)
					},
					{
						id: 'rename',
						icon: 'fa-solid fa-pen',
						description: {
							en: 'Rename this device',
							de: 'Gerät umbenennen',
							ru: 'Переименовать это устройство',
							pt: 'Renomear este dispositivo',
							nl: 'Hernoem dit apparaat',
							fr: 'Renommer cet appareil',
							it: 'Rinomina questo dispositivo',
							es: 'Renombrar este dispositivo',
							pl: 'Zmień nazwę tego urządzenia',
							'zh-cn': '重命名此设备',
							uk: 'Перейменуйте цей пристрій'
						},
						handler: this.handleRenameDevice.bind(this)
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

	async getDeviceDetails(id, action, context) {
		this.adapter.log.info('getDeviceDetails');
		const devices = await this.adapter.getDevicesAsync();
		const device = devices.find(d => d._id === id);
		if(!device) {
			return {error: 'Device not found'};
		}
		if(!device.native.Sender_ID) {
			return null;
		}
		const data = {
			id: device._id,
			schema: {
				type: 'panel',
				items: {
					senderId: {
						type: 'staticText',
						text: device.native.Sender_ID ?  `Sender ID: ${device.native.Sender_ID.toUpperCase()}` : ``,
						newLine: true
					}
				}
			}

		};

		return data;
	}

	async handleDeleteDevice(id, context) {
		// Remove namespace from context
		const name = id.replace(/enocean\.\d\./, '');

		const response = await context.showConfirmation({
			en: `Do you really want to delete the device ${name}?`,
			de: `Möchten Sie das Gerät ${name} wirklich löschen?`,
			ru: `Вы действительно хотите удалить устройство ${name}?`,
			pt: `Você realmente deseja excluir o dispositivo ${name}?`,
			nl: `Weet u zeker dat u het apparaat ${name} wilt verwijderen?`,
			fr: `Voulez-vous vraiment supprimer l'appareil ${name} ?`,
			it: `Vuoi davvero eliminare il dispositivo ${name}?`,
			es: `¿Realmente desea eliminar el dispositivo ${name}?`,
			pl: `Czy na pewno chcesz usunąć urządzenie ${name}?`,
			'zh-cn': `您真的要删除设备 ${name} 吗？`,
			uk: `Ви дійсно бажаєте видалити пристрій ${name}?`
		});
		this.adapter.log.info(JSON.stringify(response));
		// delete device
		if(response === false) {
			return {refresh: false};
		}
		const res = await this.adapter.deleteDeviceAsync(name);
		if(res !== null) {
			this.adapter.log.info(`${name} deleted`);
			return {refresh: true};
		} else {
			this.adapter.log.error(`Can not delete device ${name}: ${JSON.stringify(res)}`);
			return {refresh: false};
		}
	}

	async handleRenameDevice(id, context) {
		const result = await context.showForm({
			type : 'panel',
			items: {
				newName: {
					type: 'text',
					trim: false,
					placeholder: '',
				}
			}}, {
			data: {
				newName: ''
			},
			title: {
				en: 'Enter new name',
				de: 'Neuen Namen eingeben',
				ru: 'Введите новое имя',
				pt: 'Digite um novo nome',
				nl: 'Voer een nieuwe naam in',
				fr: 'Entrez un nouveau nom',
				it: 'Inserisci un nuovo nome',
				es: 'Ingrese un nuevo nombre',
				pl: 'Wpisz nowe imię',
				'zh-cn': '输入新名称',
				uk: 'Введіть нове ім\'я'
			}
		});
		if(result.newName === undefined || result.newName === '') {
			return {refresh: false};
		}
		const obj = {
			common: {
				name: result.newName
			}
		};
		const res = await this.adapter.extendObjectAsync(id, obj);
		this.adapter.log.info(JSON.stringify(res));
		if(res === null) {
			this.adapter.log.warn(`Can not rename device ${context.id}: ${JSON.stringify(res)}`);
			return {refresh: false};
		}
		return {refresh: true};
	}

}

module.exports = dmEnocean;