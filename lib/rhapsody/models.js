'use strict';

var fs = require('fs'),
	_ = require('lodash');

/**
 * Models can have the following attributes:
 * - attributes (just type, or the following)
 * 		- type (http://mongoosejs.com/docs/schematypes.html)
 * 		- validations (must be in sharedMethods)
 * - sharedMethods
 * - clientMethods
 * - serverMethods
 * - options
 * 		- allowREST
 * 		- middlewares
 */

module.exports = function generateModels() {
	var modelsPath = Rhapsody.root + '/models';

	fs.readdirSync(modelsPath).forEach(function(file) {
		var attributes = {},
			validations = {},
      validationArray;

		var modelName = file.substring(0, file.length - 3);
		var requiredModel = require(modelsPath + '/' + modelName);
		var modelAttributes = requiredModel.attributes;

		for(var attr in modelAttributes) {
			//If the attribute has properties
			if(typeof modelAttributes[attr] === 'object' && modelAttributes[attr] != null) {
				if(typeof modelAttributes[attr].validations === 'undefined') {
					attributes[attr] = modelAttributes[attr];
				}
				//If it has validations, save it
				else {
					attributes[attr] = _.omit(modelAttributes[attr], 'validations');
					validations[attr] = modelAttributes[attr].validations;
				}
			}
			else  {
				attributes[attr] = modelAttributes[attr];
			}
		}

		for(attr in validations) {
			validationArray = [];
			for(var validation in validations[attr]) {
				//Get the validation function in the sharedMethods
				var validationFunction = requiredModel.sharedMethods[validations[attr][validation]];
				validationArray.push(validationFunction);
			}
			attributes[attr].validate = validationArray;
		}

		//Create the mongoose schema
		var schema = new Rhapsody.database.Schema(attributes);
    // var serverModel = Rhapsody.database.model(modelName, schema);
		var serverModel = Rhapsody.dbConnection.model(modelName, schema);
    var clientModel = {};

		Rhapsody.models[modelName] = {
			options: requiredModel.options,
			serverModel: serverModel,
			clientModel: clientModel
		}

	});
};