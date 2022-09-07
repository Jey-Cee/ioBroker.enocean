const object_definitions = {
	'TMP': {
		'type': 'state',
		'common': {
			'name': {
				'en': 'Temperature',
				'de': 'Temperatur'
			},
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
			'name': {
				'en': 'Humidity 0...100%',
				'de': 'Luftfeuchtigkeit 0...100%'
			},
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
			'name': {
				'en': 'Humidity 0...100%',
				'de': 'Luftfeuchtigkeit 0...100%'
			},
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
			'name': {
				'en': 'Illumination',
				'de': 'Helligkeit'
			},
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
			'name': {
				'en': 'Supply Voltage',
				'de': 'Versorgungsspannung'
			},
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
			'name': {
				'en': 'PIR Status',
				'de': 'PIR Status'
			},
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
			'name': {
				'en': 'Occupancy',
				'de': 'Belegung'
			},
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
			'name': {
				'en': 'Day',
				'de': 'Tag'
			},
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
			'name': {
				'en': 'Set point',
				'de': 'Sollwert'
			},
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
			'name': {
				'en': 'ON',
				'de': 'AN'
			},
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
			'name': {
				'en': 'Incoming data',
				'de': 'Eingehende Daten'
			}
		}
	},
	'in.CV': {
		'type': 'state',
		'common': {
			'name': {
				'en': 'Current Value 0...100%',
				'de': 'Aktueller Wert 0...100%'
			},
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
			'name': {
				'en': 'Temperature',
				'de': 'Temperatur'
			},
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
			'name': {
				'en': 'Detection, window open',
				'de': 'Erkennung, Fenster offen'
			},
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
			'name': {
				'en': 'Button AI',
				'de': 'Taster AI'
			},
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
			'name': {
				'en': 'Button A0',
				'de': 'Taster A0'
			},
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
			'name': {
				'en': 'Button BI',
				'de': 'Taster BI'
			},
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
			'name': {
				'en': 'Button B0',
				'de': 'Taster B0'
			},
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
			'name': {
				'en': 'Channel 1',
				'de': 'Kanal 1'
			}
		}
	},
	'CH2': {
		'type': 'channel',
		'common': {
			'name': {
				'en': 'Channel 2',
				'de': 'Kanal 2'
			}
		}
	},
	'CO2': {
		'type': 'state',
		'common': {
			'name': {
				'en': 'Gas CO2 measurement',
				'de': 'Gas CO2 Messung'
			},
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
			'name': {
				'en': 'Turn-switch for fan speed',
				'de': 'Dreh-Schalter für Lüftergeschwindigkeit'
			},
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
			'name': {
				'en': 'Position',
				'de': 'Position'
			},
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
			'name': {
				'en': 'Rain',
				'de': 'Regen'
			},
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
			'name': {
				'en': 'Wind',
				'de': 'Wind'
			},
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
			'name': {
				'en': 'Snow',
				'de': 'Schnee'
			},
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
			'name': {
				'en': 'Sun South',
				'de': 'Sonne Süden'
			},
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
			'name': {
				'en': 'Sun East',
				'de': 'Sonne Osten'
			},
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
			'name': {
				'en': 'Alarm',
				'de': 'Alarm'
			},
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
			'name': {
				'en': 'Report measurement',
				'de': 'Bericht über die Messung'
			},
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
			'name': {
				'en': 'Measurement mode',
				'de': 'Messmodus'
			},
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
			'name': {
				'en': 'Maximum time between two subsequent actuator messages',
				'de': 'Maximale Zeit zwischen zwei aufeinanderfolgenden Aktor-Nachrichten'
			},
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
			'name': {
				'en': 'Minimum time between two subsequent actuator messages',
				'de': 'Minimale Zeit zwischen zwei aufeinanderfolgenden Aktor-Nachrichten'
			},
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
			'name': {
				'en': 'Query',
				'de': 'Abfrage'
			},
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
			'name': {
				'en': 'Energy counter',
				'de': 'Energiezähler'
			},
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
			'name': {
				'en': 'Actual Power',
				'de': 'Aktuelle Leistung'
			},
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
			'name': {
				'en': 'Button Release',
				'de': 'Taste losgelassen'
			},
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
