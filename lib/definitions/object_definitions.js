const object_definitions = {
	'TMP': {
		'type': 'state',
		'common': {
			'name': 'Temperature',
			'role': 'value.temperature',
			'type': 'number',
			'read': true,
			'write': true,
			'unit': '°C',
			'def': 0
		},
		'native': {}
	},
	'HUM': {
		'type': 'state',
		'common': {
			'name': 'Humidity 0...100%',
			'role': 'value.humidity',
			'type': 'number',
			'read': true,
			'write': true,
			'unit': '%',
			'def': 0
		},
		'native': {}
	},
	'HM': {
		'type': 'state',
		'common': {
			'name': 'Humidity 0...100%',
			'role': 'value.humidity',
			'type': 'number',
			'read': true,
			'write': true,
			'unit': '%',
			'def': 0
		},
		'native': {}
	},
	'ILL': {
		'type': 'state',
		'common': {
			'name': 'Illumination',
			'role': 'value.brightness',
			'type': 'number',
			'read': true,
			'write': false,
			'unit': 'lx',
			'def': 0
		},
		'native': {}
	},
	'SVC': {
		'type': 'state',
		'common': {
			'name': 'Supply Voltage',
			'role': 'value.battery',
			'type': 'number',
			'unit': 'V',
			'read': true,
			'write': false,
			'def': 0
		},
		'native': {}
	},
	'PIRS': {
		'type': 'state',
		'common': {
			'name': 'PIR Status',
			'role': 'sensor.motion',
			'type': 'boolean',
			'read': true,
			'write': false,
			'def': false
		},
		'native': {}
	},
	'OCC': {
		'type': 'state',
		'common': {
			'name': 'Occupancy',
			'role': 'switch',
			'type': 'boolean',
			'read': true,
			'write': false,
			'def': false
		},
		'native': {}
	},
	'SLSW': {
		'type': 'state',
		'common': {
			'name': 'Day',
			'role': 'switch',
			'type': 'boolean',
			'read': true,
			'write': false,
			'def': false
		},
		'native': {}
	},
	'SP': {
		'type': 'state',
		'common': {
			'name': 'Set point',
			'role': 'value',
			'type': 'number',
			'read': true,
			'write': true,
			'def': 0
		},
		'native': {}
	},
	'ON': {
		'type': 'state',
		'common': {
			'name': 'ON',
			'role': 'state',
			'type': 'boolean',
			'read': true,
			'write': false,
			'def': false
		},
		'native': {}
	},
	'in': {
		'type': 'channel',
		'common': {
			'name': 'Incoming data'
		}
	},
	'in.CV': {
		'type': 'state',
		'common': {
			'name': 'Current Value 0...100%',
			'role': 'value.valve',
			'type': 'number',
			'unit': '%',
			'read': true,
			'write': false,
			'def': 0
		},
		'native': {}
	},
	'in.TMP': {
		'type': 'state',
		'common': {
			'name': 'Temperature',
			'role': 'value.temperature',
			'type': 'number',
			'read': true,
			'write': true,
			'unit': '°C',
			'def': 0
		},
		'native': {}
	},
	'in.DWO': {
		'type': 'state',
		'common': {
			'name': 'Detection, window open',
			'role': 'indicator',
			'type': 'boolean',
			'read': true,
			'write': false,
			'def': false
		},
		'native': {}
	},
	'AI': {
		'type': 'state',
		'common': {
			'name': 'Button AI',
			'role': 'switch',
			'type': 'boolean',
			'read': true,
			'write': false,
			'def': false
		},
		'native': {}
	},
	'A0': {
		'type': 'state',
		'common': {
			'name': 'Button A0',
			'role': 'switch',
			'type': 'boolean',
			'read': true,
			'write': false,
			'def': false
		},
		'native': {}
	},
	'BI': {
		'type': 'state',
		'common': {
			'name': 'Button BI',
			'role': 'switch',
			'type': 'boolean',
			'read': true,
			'write': false,
			'def': false
		},
		'native': {}
	},
	'B0': {
		'type': 'state',
		'common': {
			'name': 'Button B0',
			'role': 'switch',
			'type': 'boolean',
			'read': true,
			'write': false,
			'def': false
		},
		'native': {}
	},
	'CH1': {
		'type': 'channel',
		'common': {
			'name': 'Channel 1'
		}
	},
	'CH2': {
		'type': 'channel',
		'common': {
			'name': 'Channel 2'
		}
	},
	'CO2': {
		'type': 'state',
		'common': {
			'name': 'Gas CO2 measurement',
			'role': 'value.gas',
			'type': 'number',
			'read': true,
			'write': false,
			'unit': 'ppm',
			'def': 0
		},
		'native': {}
	},
	'FAN': {
		'type': 'state',
		'common': {
			'name': 'Turn-switch for fan speed',
			'role': 'value',
			'type': 'number',
			'read': true,
			'write': false,
			'states': {'0': 'Stage Auto', '1':'Stage 0', '2':'Stage 1', '3':'Stage 2', '4':'Stage 3'},
			'def': 0
		},
		'native': {}
	},
	'POS': {
		'type': 'state',
		'common': {
			'name': 'Position',
			'role': 'level.blind',
			'type': 'number',
			'unit': '%',
			'read': false,
			'write': true,
			'min': 0,
			'max': 100,
			'def': 0
		},
		'native': {}
	},
	'RAN': {
		'type': 'state',
		'common': {
			'name': 'Rain',
			'role': 'switch',
			'type': 'boolean',
			'read': true,
			'write': false,
			'def': false
		},
		'native': {}
	},
	'WND': {
		'type': 'state',
		'common': {
			'name': 'Wind speed',
			'role': 'value.speed',
			'type': 'number',
			'read': true,
			'write': false,
			'unit': 'm/s',
			'def': 0
		},
		'native': {}
	},
	'SNW': {
		'type': 'state',
		'common': {
			'name': 'Sun West',
			'role': 'value.brightness',
			'type': 'number',
			'read': true,
			'write': false,
			'unit': 'klx',
			'def': 0
		},
		'native': {}
	},
	'SNS': {
		'type': 'state',
		'common': {
			'name': 'Sun South',
			'role': 'value.brightness',
			'type': 'number',
			'read': true,
			'write': false,
			'unit': 'klx',
			'def': 0
		},
		'native': {}
	},
	'SNE': {
		'type': 'state',
		'common': {
			'name': 'Sun East',
			'role': 'value.brightness',
			'type': 'number',
			'read': true,
			'write': false,
			'unit': 'klx',
			'def': 0
		},
		'native': {}
	},
	'AL': {
		'type': 'state',
		'common': {
			'name': 'Alarm',
			'role': 'state',
			'type': 'boolean',
			'read': true,
			'write': false,
			'def': false
		},
		'native': {}
	},
	'RM': {
		'type': 'state',
		'common': {
			'name': 'Report measurement',
			'role': 'state',
			'type': 'number',
			'read': true,
			'write': true,
			'states': {'0':'Query only', '1':'Auto reporting'},
			'def': 0
		},
		'native': {}
	},
	'ep': {
		'type': 'state',
		'common': {
			'name': 'Measurement mode',
			'role': 'state',
			'type': 'number',
			'read': true,
			'write': true,
			'states': {'0':'Energy measurement', '1':'Power measurement'},
			'def': 0
		},
		'native': {}
	},
	'MAT': {
		'type': 'state',
		'common': {
			'name': 'Maximum time between two subsequent actuator messages',
			'role': 'state',
			'type': 'number',
			'read': true,
			'write': true,
			'min': 10,
			'max': 2550,
			'unit': 's',
			'def': 10
		},
		'native': {}
	},
	'MIT': {
		'type': 'state',
		'common': {
			'name': 'Minimum time between two subsequent actuator messages',
			'role': 'state',
			'type': 'number',
			'read': true,
			'write': true,
			'min': 1,
			'max': 255,
			'unit': 's',
			'def': 1
		},
		'native': {}
	},
	'qu': {
		'type': 'state',
		'common': {
			'name': 'Query',
			'role': 'state',
			'type': 'number',
			'read': true,
			'write': true,
			'states': {'0':'Query energy','1':'Query power'},
			'def': 0
		},
		'native': {}
	},
	'EC': {
		'type': 'state',
		'common': {
			'name': 'Energy counter',
			'role': 'state',
			'type': 'number',
			'read': true,
			'write': false,
			'def': 0
		},
		'native': {}
	},
	'AC': {
		'type': 'state',
		'common': {
			'name': 'Actual Power',
			'role': 'state',
			'type': 'number',
			'read': true,
			'write': false,
			'def': 0
		},
		'native': {}
	},
	'REL': {
		'type': 'state',
		'common': {
			'name': 'Button Release',
			'role': 'switch',
			'type': 'boolean',
			'read': true,
			'write': false,
			'def': true
		},
		'native': {}
	}
};

module.exports = {objDef: object_definitions};
