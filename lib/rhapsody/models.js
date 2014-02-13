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

module.exports = {
	generateModels: function generateModels() {
		var requiredModel,
			modelName,
			modelsPath = Rhapsody.root + '/models',
			serverModel,
			clientModel,
			schema,
			attr,
			modelAttributes,
			validation,
			validationFunction,
			validationName,
			validationArray;

		fs.readdirSync(modelsPath).forEach(function(file) {
			var attributes = {},
				validations = {};

			modelName = file.substring(0, file.length - 3);
			requiredModel = require(modelsPath + '/' + modelName);
			modelAttributes = requiredModel.attributes;

			for(attr in modelAttributes) {
				//If the attribute has properties
				if(typeof modelAttributes[attr] === 'object' && modelAttributes[attr] != null) {
					if(typeof modelAttributes[attr].validations === 'undefined') {
						attributes[attr] = modelAttributes[attr];
					}
					//If it has validations, save it
					else {
						attributes[attr] = _.omit(modelAttributes[attr]);
						validations[attr] = modelAttributes[attr].validations;
					}
				}
				else  {
					attributes[attr] = modelAttributes[attr];
				}
			}

			for(attr in validations) {
				validationArray = [];
				for(validation in validations[attr]) {
					//Get the validation function in the sharedMethods
					validationFunction = requiredModel.sharedMethods[validations[attr][validation]];
					validationArray.push(validationFunction);
				}
				attributes[attr].validate = validationArray;
			}

			//Create the mongoose schema
			schema = Rhapsody.database.Schema(attributes);
			serverModel = Rhapsody.database.model(modelName, schema);

			Rhapsody.models[modelName] = {
				options: requiredModel.options,
				serverModel: serverModel,
				clientModel: clientModel
			}

		});
	}
};