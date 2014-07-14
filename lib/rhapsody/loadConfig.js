var path = require('path');

module.exports = function loadConfig(options) {
	var configs = {};

	configs.options = options;

	var configPaths = {
		cors: path.join(options.root, '/app/config/cors'),
		error: path.join(options.root, '/app/config/error/error'),
		httpsOptions: path.join(options.root, '/app/config/https'),
		session: path.join(options.root, '/app/config/session'),
		templateEngines: path.join(options.root, '/app/config/template-engines'),
		i18n: path.join(options.root, '/app/config/i18n')
	};

	for(var config in configPaths) {
		try {
			configs[config] = require(configPaths[config]);
		}
		catch(e) {
			configs[config] = { enabled: false };
		}
	}

	return configs;
};