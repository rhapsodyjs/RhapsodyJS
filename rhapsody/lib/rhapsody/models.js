'use strict';

var fs = require('fs-extra'),
    _ = require('lodash'),
    path = require('path');

/**
 * Models can have the following attributes:
 * - attributes (just type, or the following)
 * 		- type (http://mongoosejs.com/docs/schematypes.html)
 * 		- serverValidations (must be in sharedMethods)
 *    - default
 *    - required
 * - sharedMethods
 * - clientMethods
 *   - validate (the used methods must be in client methods or shared methods)
 * - serverMethods
 * - options
 * 		- allowREST
 * 		- middlewares
 *    - urlRoot (for a custom URL root)
 *
 * The Backbone model generated is compatible with RequireJS, CommonJS and global scope
 */

/**
 * Generate client and server-side models
 */
var generateModels = function generateModels(app, buildBackboneModels) {
  var jsFileRegex = /^\w+\.js$/i;

	var modelsPath = path.join(app.root, '/models');

  //If the Backbone models are going to be generated
  // clean where they'll be saved
  if(buildBackboneModels) {
    fs.removeSync(path.join(app.root, '/backbone-models/gen/'), function (err) {
      if(err) {
        throw err;
      }
    });
    fs.mkdirSync(path.join(app.root, '/backbone-models/gen/'), function (err) {
      if(err) {
        throw err;
      }
    });
  }

	fs.readdirSync(modelsPath).forEach(function(file) {
    if(jsFileRegex.test(file)) {

      var serverAttributes = {},
          serverValidations = {},
          clientDefaults = {},
          modelName = file.substring(0, file.length - 3),
          requiredModel = require(path.join(modelsPath, '/' + modelName)),
          modelAttributes = requiredModel.attributes;

      for(var attr in modelAttributes) {
        //If the attribute has properties
        if(typeof modelAttributes[attr] === 'object' && modelAttributes[attr] != null) {
          if(typeof modelAttributes[attr].serverValidations === 'undefined') {
            serverAttributes[attr] = modelAttributes[attr];
          }
          //If it has validations, save it
          else {
            //Creates a copy of the attributes without the serverValidations array
            serverAttributes[attr] = _.omit(modelAttributes[attr], 'serverValidations');
            serverValidations[attr] = modelAttributes[attr].serverValidations;
          }

          //Save the default value to use in generated client model
          if(typeof modelAttributes[attr].default !== 'undefined') {
            clientDefaults[attr] = modelAttributes[attr].default;
          }
        }
        else {
          serverAttributes[attr] = modelAttributes[attr];
        }
      }

      var serverModel = generateServerModel(modelName, serverAttributes, serverValidations, requiredModel, app);

      //If, during the build, the Backbone models must be generated
      if(buildBackboneModels) {
        generateClientModel(modelName, clientDefaults, requiredModel, app);
      }

      app.models[modelName] = {
        options: requiredModel.options,
        serverModel: serverModel
      }

    }
	});
};

/**
 * Generate a single server model
 * @param  {String} modelName
 * @param  {Object} serverAttributes The attributes the model will have
 * @param  {Array} serverValidations      Array of validation names
 * @param  {Object} requiredModel    The generic model
 * @param {Rhapsody} app A Rhapsody app
 * @return {Mongoose Model}
 */
var generateServerModel = function generateServerModel(modelName, serverAttributes, serverValidations, requiredModel, app) {
  var attr,
      validation,
      validationArray;

  for(attr in serverValidations) {
    validationArray = [];
    for(validation in serverValidations[attr]) {
      //Get the validation function in the sharedMethods
      var validationFunction = requiredModel.sharedMethods[serverValidations[attr][validation]];
      validationArray.push(validationFunction);
    }
    serverAttributes[attr].validate = validationArray;
  }

  var schema = new app.database.Schema(serverAttributes);

  //Merge shared methods first, so it can be overwriten by specific server methods
  schema.methods = _.merge(schema.methods, requiredModel.sharedMethods);
  schema.methods = _.merge(schema.methods, requiredModel.serverMethods);

  var serverModel = app.dbConnection.model(modelName, schema);
  
  return serverModel;
}

/**
 * Generate a client model
 * @param  {String} modelName      
 * @param  {Array} clientDefaults Array of default values of any attribute
 * @param  {Object} requiredModel  The generic model
 * @param  {Rhapsody} app            A Rhapsody app
 */
var generateClientModel = function generateClientModel(modelName, clientDefaults, requiredModel, app) {
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
  clientModel = _.merge(clientModel, requiredModel.clientMethods);

  //Lodash template for Backbone.Model
  var backboneModelTemplate = _.template('(function(){var <%= name %>=Backbone.Model.extend(<%= modelData %>);if(typeof module!==\'undefined\' && module.exports){module.exports=<%= name %>;}else if(typeof window.define===\'function\' && window.define.amd){define(function(){return <%= name %>;});}else{window.<%= name %>=<%= name %>;}}());');

  //Create the Backbone.Model file content
  var backboneModelString = backboneModelTemplate({
    name: modelName,
    modelData: JSON.stringify(clientModel)
  });

  var modelPath = path.join(app.root, '/backbone-models/gen/' + modelName + '.js');

  //Remove if the Backbone.Model already exists
  fs.remove(modelPath, function(err) {
    if(err) {
      throw err;
    }
    //Then create it again
    fs.writeFile(modelPath, backboneModelString, function(err) {
      if(err) {
        throw err;
      }
    });

  });
};


module.exports = generateModels;