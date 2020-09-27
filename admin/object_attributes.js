let objectTypes = {
	'state': {
		desc: 'State. Parents should be of type channel, device, instance or host.',
		attrMandatory: ['name', 'read', 'write', 'role', 'type'],
		attrOptional: ['def', 'defAck', 'desc', 'min', 'max', 'step', 'unit', 'states', 'workingID', 'custom', 'history', 'history.*.changesOnly', 'history.*.enabled']
	},
	'channel': {desc: 'Channel. Group of states.', attrMandatory: ['name'], attrOptional: ['role', 'desc']},
	'device': {desc: 'Device. Group of channels and/or states.', attrMandatory: ['name']},
	'folder': {desc: 'A bunch of devices or other objects', attrMandatory: ['name']},
	'enum': {
		desc: 'Objects holding a array in common.members that points to states, channels, devices or files. Enums can have a parent enum.',
		attrMandatory: ['name', 'members']
	},
	'host': {
		desc: 'A host that runs a controller process',
		attrMandatory: ['name', 'version', 'platform', 'cmd', 'hostname', 'address'],
		attrOptional: ['process']
	},
	'adapter': {
		desc: 'The default config of an adapter. Presence also indicates that the adapter is successfully installed.',
		attrMandatory: ['enabled', 'installedVersion', 'name', 'mode', 'platform', 'titleLang', 'version', 'extIcon', 'icon', 'keywords', 'logLevel', 'materialize', 'type'],
		attrOptional: ['adminTab.fa-icon', 'adminTab.ignoreConfigUpdate', 'adminTab.link', 'adminTab.name', 'adminTab.singleton', 'allowInit', 'availableModes', 'blockly',
			'connectionType', 'compact', 'dataFolder', 'dataSource', 'dependencies', 'docs', 'eraseOnUpload', 'expert', 'getHistory', 'localLinks', 'logTransporter', 'main',
			'materializeTab', 'messagebox', 'noConfig', 'noIntro', 'noRepository', 'noGit', 'nondeletable', 'onlyWWW', 'osDependencies.darwin', 'osDependencies.linux',
			'osDependencies.win32', 'os', 'preserveSettings', 'restartAdapters', 'schedule', 'serviceStates', 'singletonHost', 'singleton', 'stopBeforeUpdate', 'stopTimeout',
			'subscribable', 'subscribe', 'supportCustoms', 'supportStopInstance', 'unchanged', 'unsafePerm', 'wakeup', 'webByVersion', 'webExtendable', 'webExtension', 'webPreSettings',
			'webservers', 'welcomeScreen', 'welcomeScreen.order', 'welcomeScreenPro', 'wwwDontUpload', 'protectedNative']
	},
	'instance': {
		desc: 'Instance of adapter. Parent has to be of type adapter',
		attrMandatory: ['host', 'enabled', 'mode']
	},
	'meta': {desc: 'Rarely changing meta information that a adapter or his instances needs'},
	'config': {desc: 'Configuration object'},
	'script': {
		desc: 'Represenst a script',
		attrMandatory: ['platform', 'enabled', 'source'],
		attrOptional: ['engine']
	},
	'user': {
		desc: 'Represents a ioBroker user and holds necessary information',
		attrMandatory: ['name', 'password']
	},
	'group': {
		desc: 'Represents a group',
		attrMandatory: ['name', 'members'],
		attrOptional: ['desc']
	},
	'chart': {desc: 'Represents a chart (e.g. for flot)'}
};

let commonAttributes = {
	'type': {
		desc: 'Represents the data type of the object',
		type: ['number', 'string', 'boolean', 'array', 'object', 'mixed', 'file', 'meta.user', 'meta.folder'],
		attrType: 'string'
	},
	'name': {desc: 'Name. User name is case sensitive.', attrType: 'string'},
	'min': {
		desc: 'The minimum value that is allowed for the state',
		type: 'number',
		write: true,
		attrType: 'number'
	},
	'max': {
		desc: 'The maximum value that is allowed for the state',
		type: 'number',
		write: true,
		attrType: 'number'
	},
	'step': {desc: 'Increase/decrease intervall', type: 'number', write: true, attrType: 'number'},
	'unit': {desc: 'The unit of the value', type: 'number', attrType: 'string'},
	'def': {desc: 'Default value', attrType: ['string', 'number', 'boolean', 'array', 'object']},
	'defAck': {desc: 'If common.def is set the ACK flag is set to this value', attrType: 'boolean'},
	'desc': {desc: 'Description what this object is for', attrType: 'string'},
	'read': {desc: 'Indicates if this state is readable', attrType: 'boolean'},
	'write': {desc: 'Indicates if this state is writable', attrType: 'boolean'},
	'role': {
		desc: 'Role of the state (used in user interfaces to indicate which widget to choose.)',
		attrType: 'string'
	},
	'states': {
		desc: 'Object with values and their pseudonym. {\'value\': \'valueName\', \'value2\': \'valueName2\', 0: \'OFF\', 1: \'ON\'}',
		attrType: 'object'
	},
	'workingID': {
		desc: 'If this state has helper state WORKING. Here must be written the full name or just the last part if the first parts are the same with actual. Used for HM.LEVEL and normally has value "WORKING"',
		type: 'string',
		role: 'indicator.working',
		attrType: 'string'
	},
	'custom': {
		desc: 'The structure with custom settings for specific adapters. Like {"influxdb.0": {"enabled": true, "alias": "name"}}. enabled attribute is required and if it is not true, the whole attribute will be deleted.',
		attrType: 'object'
	},
	'history': {desc: 'History function needs the history adapter or any other storage adapter of type history\n fifo length is reduced to min when max is hit. set to null or leave undefined to use defaults\n for a list of transports see history adapter README'},
	'history.*.changesOnly': {desc: 'Log only changes', attrType: 'boolean'},
	'history.*.enabled': {desc: 'History enabled for this state', attrType: 'boolean'},
	'members': {desc: 'Holds an array with member IDs', attrType: 'array'},
	'adminTab.fa-icon': {desc: 'Font-Awesome icon name for TAB.', attrType: 'string'},
	'adminTab.ignoreConfigUpdate': {
		desc: 'Do not update config TAB if configuration changed.',
		attrType: 'boolean'
	},
	'adminTab.link': {
		desc: 'Link for iframe in the TAB. You can use parameters replacement like this: "http://%ip%:%port%". IP will be replaced with host IP. "port" will be extracted from native.port.',
		attrType: 'string'
	},
	'adminTab.name': {desc: 'Name of TAB in admin', attrType: 'string'},
	'adminTab.singleton': {
		desc: 'True if adapter has TAB for admin. Only one TAB for all instances will be shown.',
		attrType: 'boolean'
	},
	'allowInit': {
		desc: 'Allow for "scheduled" adapter to be called "not in the time schedule", if settings changed or adapter started. Or allow scheduled adapter start once after configuration changed and then by schedule.',
		attrType: 'boolean'
	},
	'availableModes': {desc: 'Values for common.mode if more than one mode is possible', attrType: 'string'},
	'blockly': {
		desc: 'True if adapter has custom blocks for blockly. (admin/blockly.js required)',
		attrType: 'boolean'
	},
	'connectionType': {
		desc: 'Connection type with device: local/cloud. See common.dataSource too.',
		attrType: 'string'
	},
	'compact': {
		desc: 'Says to controller that this adapter can be started in the same process if desired.',
		attrType: 'boolean'
	},
	'dataFolder': {
		desc: 'Folder relative to iobroker-data where the adapter stores the data. This folder will be backed up and restored automatically. You can use variable \'%INSTANCE%\' in it.',
		attrType: 'string'
	},
	'dataSource': {
		desc: 'How the data will be received from device: poll/push/assumption. It is important together with connectionType.',
		attrType: 'string'
	},
	'dependencies': {
		desc: 'Array like [{"js-controller": ">=2.0.0"}] that describes which ioBroker modules are required for this adapter.',
		attrType: 'array'
	},
	'docs': {
		desc: 'The structure like {"en": "docs/en/README.md", "de": ["docs/de/README.md", "docs/de/README1.md"]} that describes the documentation if not in README.md',
		attrType: 'string'
	},
	'enabled': {desc: 'Value should be false so new instances are disabled by default', attrType: 'boolean'},
	'eraseOnUpload': {desc: 'Erase all previous data in the directory before upload', attrType: 'boolean'},
	'expert': {desc: 'Show this object only in expert mode in admin.', attrType: 'boolean'},
	'extIcon': {
		desc: 'Link to external icon for uninstalled adapters. Normally on github.',
		attrType: 'string'
	},
	'getHistory': {desc: 'True if adapter supports getHistory message', attrType: 'boolean'},
	'icon': {desc: 'Name of the local icon (should be located in subdirectory "admin")', attrType: 'string'},
	'installedVersion': {desc: 'Installed version of adapter, includes source path.', attrType: 'string'},
	'keywords': {
		desc: 'Similar to keywords in package.json, but can be defined in many languages.',
		attrType: 'array'
	},
	'localLinks': {
		desc: 'Link to the web service of this adapter. E.g to http://localhost:5984/_utils for futon from admin',
		attrType: 'string'
	},
	'logLevel': {
		desc: 'Configured level of logging.',
		value: ['debug', 'warn', 'error', 'info', 'silly'],
		attrType: 'string'
	},
	'logTransporter': {
		desc: 'If this adapter receives logs from other hosts and adapters (e.g. to strore them somewhere)',
		attrType: 'string'
	},
	'main': {desc: 'Start file of the adapter. Same as in package.json.', attrType: 'string'},
	'materializeTab': {desc: 'If adapter supports > admin3 for TAB (materialize style)', attrType: 'boolean'},
	'materialize': {desc: 'If adapter supports > admin3 (materialize style)', attrType: 'boolean'},
	'messagebox': {
		desc: 'True if message box supported. If yes, the object system.adapter.<adapter.name>.<adapter.instance>.messagebox will be created to send messges to adapter (used for email, pushover,…;',
		attrType: 'boolean'
	},
	'mode': {
		desc: 'Running mode of adapter/instance',
		value: ['none', 'daemon', 'subscribe', 'schedule', 'once', 'extension'],
		attrType: 'string'
	},
	'noConfig': {desc: 'Do not show configuration dialog for instance', attrType: 'boolean'},
	'noIntro': {
		desc: 'Never show instances of this adapter on Intro/Overview screen in admin (like icons, widgets)',
		attrType: 'boolean'
	},
	'noRepository': {
		desc: 'True if adapter delivered with initial installation or has own repository',
		attrType: 'boolean'
	},
	'noGit': {desc: 'If true, no install from github directly is possible', attrType: 'boolean'},
	'nondeletable': {
		desc: 'This adapter cannot be deleted or updated. It will be updated together with controller.',
		attrType: 'boolean'
	},
	'onlyWWW': {
		desc: 'Say to controller, that adapter has only html files and no main.js, like rickshaw',
		attrType: 'boolean'
	},
	'osDependencies.darwin': {desc: 'Array of OSX packages, that required for this adapter', attrType: 'array'},
	'osDependencies.linux': {
		desc: 'Array of debian/centos packages, that required for this adapter (of course only OS with apt, apt-get, yum as package managers)',
		attrType: 'array'
	},
	'osDependencies.win32': {desc: 'Not used, because win32 has no package manager'},
	'os': {
		desc: 'String or array of supported operation systems, e.g ["linux", "darwin"]',
		attrType: ['string', 'array']
	},
	'platform': {desc: 'possible values: Javascript/Node.js, more coming', attrType: 'string'},
	'preserveSettings': {
		desc: 'string (or array) with names of attributes in common of instance, which will not be deleted. E.g. "history", so by setState(\'system.adapter.mqtt.0", {..}) the field common.history will not be deleted even if new object does not have this field. To delete the attribute it must be explicitly done with common:{history: null}.',
		attrType: ['string', 'array']
	},
	'restartAdapters': {
		desc: 'Array with names of adapter that must be restarted after this adapter is installed, e.g. ["vis"]',
		attrType: 'array'
	},
	'schedule': {desc: 'CRON schedule if adapter runs in mode schedule.', attrType: 'string'},
	'serviceStates': {
		desc: '[true/false or path] if adapter can deliver additional states. If yes, the path adapter/lib/states.js will be called and it give following parameters function (objects, states, instance, config, callback). The function must deliver the array of points with values like function (err, result) { result = [{id: \'id1\', val: 1}, {id: \'id2\', val: 2}]}',
		attrType: ['boolean', 'string']
	},
	'singletonHost': {desc: 'Adapter can be installed only once on one host', attrType: 'boolean'},
	'singleton': {desc: 'Adapter can be installed only once in whole system', attrType: 'boolean'},
	'stopBeforeUpdate': {desc: 'True if adapter must be stopped before update', attrType: 'boolean'},
	'stopTimeout': {desc: 'Timeout in ms to wait, till adapter shut down. Default 500ms.', attrType: 'number'},
	'subscribable': {
		desc: 'Variables of this adapter must be subscribed with sendTo to enable updates.',
		attrType: 'boolean'
	},
	'subscribe': {desc: 'Name of variable, that is subscribed automatically.', attrType: 'string'},
	'supportCustoms': {
		desc: 'True if the adapter support settings for every state. It has to have custom.html file in admin. Sample can be found in ioBroker.history.',
		attrType: 'boolean'
	},
	'supportStopInstance': {
		desc: 'True if adapter supports signal stopInstance (messagebox required). The signal will be sent before stop to the adapter. (used if the problems occured with SIGTERM)',
		attrType: 'boolean'
	},
	'titleLang': {
		desc: 'Longer name of adapter in all supported languages like {en: \'Adapter\', de: \'adapter\', ru: \'Драйвер\'}',
		attrType: 'string'
	},
	'unchanged': {
		desc: 'Please do not use this flag. It is a flag to inform the system, that configuration dialog must be shown in admin.',
		attrType: 'boolean'
	},
	'unsafePerm': {
		desc: 'True if the package must be installed with "npm --unsafe-perm" parameter',
		attrType: 'boolean'
	},
	'version': {desc: 'Actual adapter version', attrType: 'string'},
	'wakeup': {
		desc: 'Adapter will be started if some value is written into system.adapter.NAME.x.wakeup. Normally the adapter should stop after processing of event.',
		attrType: 'string'
	},
	'webByVersion': {
		desc: 'Show version as prefix in web adapter (usually - ip:port/material, webByVersion - ip:port/1.2.3/material)',
		attrType: 'string'
	},
	'webExtendable': {
		desc: 'True if web server in this adapter can be extended with plugin/extensions like proxy, simple-api.',
		attrType: 'boolean'
	},
	'webExtension': {
		desc: 'Relative filename to connect the web extension. E.g. in simple-api "lib/simpleapi.js" relative to the adapter root directory. Additionally is native.webInstance required to say where this extension will be included. Empty means, it must run as own web service. "*" means every web server must include it.',
		attrType: 'string'
	},
	'webPreSettings': {
		desc: 'List of parameters that must be included into info.js by webServer adapter. (Example material)',
		attrType: 'array'
	},
	'webservers': {
		desc: 'Array of web server\'s instances that should serve content from the adapters www folder',
		attrType: 'array'
	},
	'welcomeScreen': {
		desc: 'Array of pages, that should be shown on the "web" index.html page. ["vis/edit.html", "vis/index.html"] or [{"link": "vis/edit.html", "name": "Vis editor", "img": "vis/img/edit.png", "color": "blue"}, "vis/index.html"]',
		attrType: 'array'
	},
	'welcomeScreen.order': {desc: 'Todo'},
	'welcomeScreenPro': {
		desc: 'Same as common.welcomeScreen but used only by access from ioBroker.cloud.',
		attrType: 'array'
	},
	'wwwDontUpload': {
		desc: 'Do not upload into DB the www directory. Used only for admin. You can just name you directory something else and OK.',
		attrType: 'boolean'
	},
	'protectedNative': {
		desc: 'Array of config attributes which will only be accessible by the own adapter, e.g. ["password"]',
		attrType: 'array'
	},
	'address': {desc: 'Array of ip address strings', attrType: 'array'},
	'hostname': {desc: 'Name of the machine where ioBroker is running', attrType: 'string'},
	'cmd': {desc: 'Command for ioBroker start', attrType: 'string'},
	'process': {desc: ''},
	'source': {desc: 'The script source code', attrType: 'string'},
	'engine': {
		desc: 'Script engine instance that should run this script (f.e. \'javascript.0\') - if omitted engine is automatically selected',
		attrType: 'string'
	},
	'password': {desc: 'MD5 Hash of password', attrType: 'string'},
	'host': {desc: 'Host on which the instance is running.', attrType: 'string'}
};
