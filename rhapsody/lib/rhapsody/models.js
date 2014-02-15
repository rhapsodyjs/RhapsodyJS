'use strict';

var fs = require('fs-extra'),
    _ = require('lodash'),
    path = require('path');

/**
 * Models can have the following attributes:
 * - attributes (just type, or the following)
 * 		- type (http://mongoosejs.com/docs/schematypes.html)
 * 		- validations (must be in sharedMethods)
 *    - default
 *    - required
 * - sharedMethods
 * - clientMethods
 * - serverMethods
 * - options
 * 		- allowREST
 * 		- middlewares
 *    - urlRoot (for a custom URL root)
 */

/**
 * Generate client and server-side models
 * @return {[type]} [description]
 */
var generateModels = function generateModels(buildBackboneModels) {
  var jsFileRegex = /.+\.js/gi;

	var modelsPath = path.join(Rhapsody.root, '/models');

  //If the Backbone models are going to be generated
  // clean where they'll be saved
  if(buildBackboneModels) {
    fs.removeSync(path.join(Rhapsody.root, '/backboneModels/gen/'), function (err) {
      if(err) {
        throw err;
      }
    });
    fs.mkdirSync(path.join(Rhapsody.root, '/backboneModels/gen/'), function (err) {
      if(err) {
        throw err;
      }
    });
  }

	fs.readdirSync(modelsPath).forEach(function(file) {
    if(jsFileRegex.test(file)) {

      var serverAttributes = {},
          validations = {},
          clientDefaults = {},
          modelName = file.substring(0, file.length - 3),
          requiredModel = require(path.join(modelsPath, '/' + modelName)),
          modelAttributes = requiredModel.attributes;

      for(var attr in modelAttributes) {
        //If the attribute has properties
        if(typeof modelAttributes[attr] === 'object' && modelAttributes[attr] != null) {
          if(typeof modelAttributes[attr].validations === 'undefined') {
            serverAttributes[attr] = modelAttributes[attr];
          }
          //If it has validations, save it
          else {
            //Creates a copy of the attributes without the validations array
            serverAttributes[attr] = _.omit(modelAttributes[attr], 'validations');
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

      //If, during the build, the Backbone models must be generated
      if(buildBackboneModels) {
        generateClientModel(modelName, clientDefaults, requiredModel);
      }

      Rhapsody.models[modelName] = {
        options: requiredModel.options,
        serverModel: serverModel
      }

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
  var urlRoot;

  //If the user specified a custom urlRoot, use it
  //otherwise, use /data/ModelName
  if(typeof requiredModel.options !== 'undefined' && requiredModel.options.urlRoot) {
    urlRoot = requiredModel.options.urlRoot;
  }
  else {
    urlRoot = '/data/' + modelName;
  }


  //Possible fields of a Backbone.Model
  var clientModel = {
    idAttribute: '_id',
    urlRoot: urlRoot,
    defaults: clientDefaults
  };

  //Merge shared methods first, so it can be overwriten by specific client methods
  clientModel = _.merge(clientModel, requiredModel.sharedMethods);
  clientModel + _.merge(clientModel, requiredModel.clientMethods);

  //Create the Backbone.Model file
  var modelString = 'var ' + modelName + ' = Backbone.Model.extend(';
  modelString += JSON.stringify(clientModel);
  modelString += ');';

  var modelPath = path.join(Rhapsody.root, '/backboneModels/gen/' + modelName + '.js');

  //Remove if the Backbone.Model already exists
  fs.remove(modelPath, function(err) {
    if(err) {
      throw err;
    }
    //Then create it again
    fs.writeFile(modelPath, modelString, function(err) {
      if(err) {
        throw err;
      }
    });

  });
}


module.exports = generateModels;