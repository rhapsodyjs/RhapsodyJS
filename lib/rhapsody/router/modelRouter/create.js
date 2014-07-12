var responseUtils = require('../../responseUtils'),
	_ = require('lodash'),
	filterAttributes = require('./filterAttributes');

module.exports = function create(req, res) {
	var fullModel = req.fullModel,
		ServerModel = fullModel.serverModel;

	//Remove the id and version field when inserting
	var dataToCreate = _.omit(req.body, ['id', '__v']);
	//Creates the new data and populates with the post fields
	var newData = new ServerModel(dataToCreate);
	newData.save(function createData(err) {
		if(err) {
			if(err.name === 'ValidationError') {
				Rhapsody.log.verbose(err);
				responseUtils.respond(res, 400); //Malformed syntax or a bad query
			}
			Rhapsody.log.error(err);
			responseUtils.respond(res, 500); //Internal server error
		}
		else {
			//Gets the data without the restricted attributes
			var filteredData = filterAttributes(newData, fullModel);
			Rhapsody.log.verbose('Data creation', 'New data was added to collection %s', req.params.model);
			res.json(201, filteredData); //Sucessful creation
		}
	});
};