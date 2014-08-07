var responseUtils = require('../../responseUtils'),
	_ = require('lodash'),
	filterAttributes = require('./filterAttributes');

module.exports = function readOne(req, res) {
	var fullModel = req.fullModel,
		ServerModel = fullModel.serverModel,
		//Get the names of the attributes the user wants
		requiredAttributes = (req.query.attrs ? req.query.attrs.split(',') : undefined);

	ServerModel.find(req.params.id, function readData(err, data) {
		if(err) {
			Rhapsody.log.error(err);
			return responseUtils.respond(res, 500); //Internal server error
		}

		if(!data) {
			Rhapsody.log.verbose('Data not found', 'Could not find data from collection %s to read it', req.params.model);
			return responseUtils.respond(res, 404); //Resource not found
		}

		Rhapsody.log.verbose('Data reading', 'Data was read from collection %s', req.params.model);

		//Gets the data without the restricted attributes
		var filteredData = filterAttributes(data, fullModel, requiredAttributes);

		return responseUtils.json(req, res, 200, filteredData); //Success

	});
};