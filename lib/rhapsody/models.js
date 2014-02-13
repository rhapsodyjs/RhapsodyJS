'use strict';

var fs = require('fs'),
	_ = require('lodash');

/**
 * Models can have the following attributes:
 * - attributes (just type, or the following)
 * 		- type (http://mongoosejs.com/docs/schematypes.html)
 * 		- validations (must be in sharedMethods)
 *    - default
 * - sharedMethods
 * - clientMethods
 * - serverMethods
 * - options
 * 		- allowREST
 * 		- middlewares
 */

/**
 * Generate client and server-side models
 * @return {[type]} [description]
 */
var generateModels = function generateModels() {
	var modelsPath = Rhapsody.root + '/models';

	fs.readdirSync(modelsPath).forEach(function(file) {
		var serverAttributes = {},
			validations = {},
      clientDefaults = {};

		var modelName = file.substring(0, file.length - 3);
		var requiredModel = require(modelsPath + '/' + modelName);
		var modelAttributes = requiredModel.attributes;

		for(var attr in modelAttributes) {
			//If the attribute has properties
			if(typeof modelAttributes[attr] === 'object' && modelAttributes[attr] != null) {
				if(typeof modelAttributes[attr].validations === 'undefined') {
					serverAttributes[attr] = modelAttributes[attr];
				}
				//If it has validations, save it
				else {
					serverAttributes[attr] = _.omit(modelAttributes[attr], 'validations'); //Creates a copy of the attributes without the validations array
					validations[attr] = modelAttributes[attr].validations;
				}

        //Save the default value to use in generated client model
        if(typeof modelAttributes[attr].default !== 'undefined') {
          clientDefaults[attr] = modelAttributes[attr].default;
        }
			}
			else  {
				serverAttributes[attr] = modelAttributes[attr];
			}
		}

		var serverModel = generateServerModel(modelName, serverAttributes, validations, requiredModel);
    var clientModel = generateClientModel(modelName, clientDefaults, requiredModel);

		Rhapsody.models[modelName] = {
			options: requiredModel.options,
			serverModel: serverModel,
			clientModel: clientModel
		}
	});
};

var generateServerModel = function generateServerModel(modelName, serverAttributes, validations, requiredModel) {
  var attr,
      validation,
      validationArray;

  for(attr in validations) {
    validationArray = [];
    for(validation in validations[attr]) {
      //Get the validation function in the sharedMethods
      var validationFunction = requiredModel.sharedMethods[validations[attr][validation]];
      validationArray.push(validationFunction);
    }
    serverAttributes[attr].validate = validationArray;
  }

  var schema = new Rhapsody.database.Schema(serverAttributes);
  var serverModel = Rhapsody.dbConnection.model(modelName, schema);

  return serverModel;
}

var generateClientModel = function generateClientModel(modelName, clientDefaults, requiredModel) {
  var clientModel = {
    idAttribute: '_id',
    urlRoot: '/data/' + modelName,
    defaults: clientDefaults
  };

  //Merge shared methods first, so it can be overwriten by specific client methods
  clientModel = _.merge(clientModel, requiredModel.sharedMethods);
  clientModel + _.merge(clientModel, requiredModel.clientMethods);

  return clientModel;
}


module.exports = generateModels;