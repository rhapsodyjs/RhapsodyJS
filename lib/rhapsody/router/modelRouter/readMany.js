var responseUtils = require('../../responseUtils'),
	_ = require('lodash'),
	filterAttributes = require('./filterAttributes');

module.exports = function readMany(req, res) {
	var fullModel = req.fullModel,
		ServerModel = fullModel.serverModel,
		//Get the names of the attributes the user wants
		requiredAttributes = (req.query.attrs ? req.query.attrs.split(',') : undefined),
		options = {};

	var query = req.query;

	if(query.limit) {
		options.limit = parseInt(query.limit, 10);
	}

	if(query.offset) {
		options.skip = parseInt(query.offset, 10);
	}

	if(query.orderby) {
		options.order = query.orderby;
	}

	if(query.order) {
		options.order = (options.order ? options.order + ' ' + query.order.toUpperCase() : query.order.toUpperCase());
	}

	ServerModel.all(options, function readAllData(err, data) {
		if(err) {
			Rhapsody.log.error(err);
		responseUtils.respond(res, 500); //Internal server error
		}
		else {
			//Gets the data without the restricted attributes
			var filteredData = filterAttributes(data, fullModel, requiredAttributes);

			Rhapsody.log.verbose('Data reading', 'All data was read from collection %s', req.params.model);
			if(req.query.callback) {
			  res.jsonp(200, filteredData); //No error, operation successful
			}
			else {
			  res.json(200, filteredData); //No error, operation successful
			}
		}
	});
};