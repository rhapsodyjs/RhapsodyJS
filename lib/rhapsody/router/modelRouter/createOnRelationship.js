var responseUtils = require('../../responseUtils'),
	_ = require('lodash'),
	filterAttributes = require('./filterAttributes');

module.exports = function createOnRelationship(req, res) {
	var fullModel = req.fullModel,
		ServerModel = fullModel.serverModel;;

	ServerModel.find(req.params.id, function(err, data) {
		if(err) {
			Rhapsody.log.error(err);
			return responseUtils.respond(res, 500); //Internal server error
		}
		else if(!data) {
			return responseUtils.respond(res, 400); //Malformed syntax or a bad query
		}

		//Model has this relationship
		if(data[req.params.relationship]) {

			//Remove the id and version field when inserting
			var dataToCreate = _.omit(req.body, ['id']);
			
			data[req.params.relationship].create(dataToCreate, function createRelationshipData(err, relationshipData) {

				if(err) {
					if(err.name === 'ValidationError') {
						Rhapsody.log.verbose(err);
						return responseUtils.respond(res, 400); //Malformed syntax or a bad query
					}
					else {
						Rhapsody.log.error(err);
						return responseUtils.respond(res, 500); //Internal server error
					}
				}

				Rhapsody.log.verbose('Data creation', 'Data was added to relationship %s of collection %s', req.params.relationship, req.params.model);

				//Get the data of related model, to extract restricted attributes
				var relatedModelName = fullModel.relationships[req.params.relationship]['with'],
				relatedModel = Rhapsody.requireModel(relatedModelName, true),
				requiredAttributes = (req.query.attrs ? req.query.attrs.split(',') : undefined);

				var filteredData = filterAttributes(relationshipData, relatedModel, requiredAttributes);

				responseUtils.json(req, res, 201, filteredData); //No error, operation successful

			});
		}
		else {
		  responseUtils.respond(res, 400); //Malformed syntax or a bad query
		}

	});
};