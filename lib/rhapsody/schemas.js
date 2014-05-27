var Schema = require('jugglingdb').Schema,
	_ = require('lodash');

var createSchemas = function createSchemas(rhapsodyApp) {
	rhapsodyApp.schemas = {};

	var adapters = rhapsodyApp.config.adapters,
		adapter,
		options,
		schema;

	for(adapter in adapters) {
		options = _.omit(adapters[adapter], 'lib');
		schema = new Schema(adapters[adapter].lib, options);

		rhapsodyApp.schemas[adapter] = schema;
	}
};

module.exports = createSchemas;