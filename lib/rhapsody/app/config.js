'use strict';

var path = require('path'),
	utils = require('../utils');

module.exports = function loadConfig(options) {
	var configs = {
		options: options
	},

	configPaths = {
		cors: {
			name: 'CORS',
			path: path.join(options.root, '/app/config/cors')
		},
		error: {
			name: 'error handlers',
			path: path.join(options.root, '/app/config/error/error')
		},
		httpsOptions: {
			name: 'HTTPS',
			path: path.join(options.root, '/app/config/https')
		},
		session: {
			name: 'sessions',
			path: path.join(options.root, '/app/config/session')
		},
		templateEngines: {
			name: 'template engines',
			path: path.join(options.root, '/app/config/template-engines')
		},
		i18n: {
			name: 'I18n',
			path: path.join(options.root, '/app/config/i18n')
		}
	};

	for(var config in configPaths) {
		try {
			configs[config] = require(configPaths[config].path);
		}
		catch(e) {
			utils.Logger.warn('Config error', 'File "%s" was not found or contains errors, disabling %s.', configPaths[config].path, configPaths[config].name);
			configs[config] = { enabled: false };
		}
	}

	return configs;
};