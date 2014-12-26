'use strict';

var responseUtils = require('../../responseUtils'),
	_ = require('lodash'),
	filterAttributes = require('./filterAttributes');

module.exports = function partiallyUpdate(req, res) {
	var fullModel = req.fullModel,
		ServerModel = fullModel.serverModel,
		//Remove the id and version field when updating
		dataToUpdate = _.omit(req.body, ['id']);

	ServerModel.find(req.params.id, function findDataToUpdate(err, data) {
		if(err) {
			Rhapsody.log.error(err);
			return responseUtils.respond(res, 500); //Status code for service error on server
		}

		data.updateAttributes(dataToUpdate, function updateData(updatingErr) {
			if(updatingErr) {
				Rhapsody.log.error(updatingErr);
				return responseUtils.respond(res, 400); //Malformed syntax or a bad query
			}

			Rhapsody.log.verbose('Data patch', 'Data was patched on collection %s.', req.params.model);

			var filteredData = filterAttributes(data, fullModel);

			return responseUtils.json(req, res, 202, filteredData); //The request was received

		});

	});
};