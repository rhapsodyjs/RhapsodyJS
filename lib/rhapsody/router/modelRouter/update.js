'use strict';

var responseUtils = require('../../responseUtils'),
	_ = require('lodash'),
	filterAttributes = require('./filterAttributes');

module.exports = function update(req, res) {
	var fullModel = req.fullModel,
		ServerModel = fullModel.serverModel,
		//Remove the id and version field when updating
		dataToUpdate = _.omit(req.body, ['id']);

	ServerModel.find(req.params.id, function findDataToUpdate(err, data) {
		if(err) {
			Rhapsody.log.error(err);
			return responseUtils.respond(res, 500); //Status code for service error on server
		}

		var modelAttributes = Object.keys(fullModel.attributes),
			attr;

		//Remove from the model instance all the attributes
		//that wasn't sent in the request, because JugglingDB
		//does not have a proper method for this
		for(var _attr_ in modelAttributes) {
			attr = modelAttributes[_attr_];

			data[attr] = dataToUpdate[attr] || undefined;
		}

		data.save(function updateData(updatingErr) {
			if(updatingErr) {
				Rhapsody.log.error(updatingErr);
				return responseUtils.respond(res, 400); //Malformed syntax or a bad query
			}

			var filteredData = filterAttributes(data, fullModel);

			Rhapsody.log.verbose('Data update', 'Data was updated on collection %s', req.params.model);

			return responseUtils.json(req, res, 202, filteredData); //The request was received

		});

	});
};