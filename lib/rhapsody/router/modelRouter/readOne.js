var responseUtils = require('../../responseUtils'),
	_ = require('lodash'),
	filterAttributes = require('./filterAttributes');

module.exports = function readOne(req, res) {
	var fullModel = req.fullModel;

	var ServerModel = fullModel.serverModel,
		//Get the names of the attributes the user wants
		requiredAttributes = (req.query.attrs ? req.query.attrs.split(',') : undefined);

	ServerModel.find(req.params.id, function readData(err, data) {
		if(err) {
			Rhapsody.log.error(err);
			responseUtils.respond(res, 500); //Internal server error
		}
		else {
			if(_.isNull(data)) {
				Rhapsody.log.verbose('Data not found', 'Could not find data from collection %s to read it', req.params.model);
				responseUtils.respond(res, 404); //Resource not found
			}
			else {
				//Gets the data without the restricted attributes
				var filteredData = filterAttributes(data, fullModel, requiredAttributes);

				Rhapsody.log.verbose('Data reading', 'Data was read from collection %s', req.params.model);
				if(req.query.callback) {
					res.jsonp(200, filteredData); //No error, operation successful
				}
				else {
					res.json(200, filteredData); //No error, operation successful
				}
			}
		}
	});
};