'use strict';

var responseUtils = require('../../responseUtils'),
	_ = require('lodash'),
	filterAttributes = require('./filterAttributes');

module.exports = function create(req, res) {
	var fullModel = req.fullModel,
		ServerModel = fullModel.serverModel,
		dataToCreate = _.omit(req.body, ['id']), //Remove the id and version field when inserting
		newData = new ServerModel(dataToCreate); //Creates the new data and populates with the post fields

	newData.save(function createData(err) {
		if(err) {
			if(err.name === 'ValidationError') {
				Rhapsody.log.verbose(err);
				return responseUtils.respond(res, 400); //Malformed syntax or a bad query
			}

			Rhapsody.log.error(err);
			return responseUtils.respond(res, 500); //Internal server error
		}

		Rhapsody.log.verbose('Data creation', 'New data was added to collection %s.', req.params.model);

		//Gets the data without the restricted attributes
		var filteredData = filterAttributes(newData, fullModel);

		responseUtils.json(req, res, 201, filteredData); //Sucessful creation
	});
};