'use strict';

var responseUtils = require('../../responseUtils');

module.exports = function del(req, res) {
	var fullModel = req.fullModel,
		ServerModel = fullModel.serverModel;

	ServerModel.find(req.params.id, function deleteData(errFinding, data) {
		if(errFinding) {
			Rhapsody.log.error(errFinding);
			return responseUtils.respond(res, 500); //Status code for service error on server
		}

		data.destroy(function(errDestroying) {
			if(errDestroying) {
				Rhapsody.log.error(errDestroying);
				return responseUtils.respond(res, 500); //Status code for service error on server
			}

			Rhapsody.log.verbose('Data deletion', 'Data was deleted from collection %s', req.params.model);
			return responseUtils.respond(res, 202); //The request was received

		});

	});
};