'use strict';

var fs = require('fs-extra'),
    _ = require('lodash'),
    path = require('path'),
    jsmin = require('jsmin').jsmin;

/**
 * Models can have the following attributes:
 * - attributes (just type, or the following)
 *    - type (http://mongoosejs.com/docs/schematypes.html)
 *    - serverValidations
 *    - default
 *    - required
 *    - restricted (won't be present in Backbone model and won't be sent via REST)
 * - sharedMethods
 * - clientMethods
 *   - validate (the used methods must be in client methods or shared methods)
 * - serverMethods
 * - options
 *    - allowREST
 *    - middlewares
 *
 * The Backbone model generated is compatible with RequireJS, CommonJS and global scope
 */

/**
 * Generate client and server-side models
 */
var generateModels = function generateModels(app, buildBackboneModels) {
  var jsFileRegex = /^\w+\.js$/i;

  var modelsPath = path.join(app.root, '/app/models'),
      backboneModelsPath = path.join(app.root, '/app/static/backbone-models/gen/');

  //If the Backbone models are going to be generated
  // clean where they'll be saved
  if(buildBackboneModels) {
    fs.removeSync(backboneModelsPath, function (err) {
      if(err) {
        app.log.error(err);
        throw err;
      }
    });
    fs.mkdirSync(backboneModelsPath, function (err) {
      if(err) {
        app.log.error(err);
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
          modelAttributes = requiredModel.attributes,
          restrictedAttributes = {};

      for(var attr in modelAttributes) {
        //If the attribute has properties
        if(typeof modelAttributes[attr] === 'object' && modelAttributes[attr] != null) {

          //Creates a copy of the attributes without the serverValidations array and the restricted flag
          serverAttributes[attr] = _.omit(modelAttributes[attr], ['serverValidations', 'restricted']);

          //If it has validations, save it
          if(typeof modelAttributes[attr].serverValidations !== 'undefined') {
            serverValidations[attr] = modelAttributes[attr].serverValidations;
          }

          //If current attribute is restricted to the server
          if(modelAttributes[attr].restricted) {
            restrictedAttributes[attr] = true;
          }
          else {
            //Save the default value to use in generated client model if it's not a restricted attribute
            if(typeof modelAttributes[attr].default !== 'undefined') {
              clientDefaults[attr] = modelAttributes[attr].default;
            }
          }
          
        }
        //If it just has the type, just put it on the attributes
        else {
          serverAttributes[attr] = modelAttributes[attr];
        }
      }

      var serverModel = generateServerModel(app, modelName, serverAttributes, serverValidations, requiredModel);

      //If, during the build, the Backbone models must be generated
      if((typeof app.config.generateBackboneModels === 'undefined' || app.config.generateBackboneModels) && buildBackboneModels) {
        generateClientModel(app, modelName, clientDefaults, requiredModel);
      }

      app.models[modelName] = {
        options: requiredModel.options,
        serverModel: serverModel,
        restrictedAttributes: restrictedAttributes
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
var generateServerModel = function generateServerModel(app, modelName, serverAttributes, serverValidations, requiredModel) {
  var attr,
      validation,
      validationArray;

  //For each attribute that needs validation
  for(attr in serverValidations) {
    validationArray = [];
    //For each validation for that attribute
    for(validation in serverValidations[attr]) {
      //Get the validation function in the serverMethods
      var validationFunction = requiredModel.serverMethods[serverValidations[attr][validation]];
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
var generateClientModel = function generateClientModel(app, modelName, clientDefaults, requiredModel) {
  var urlRoot = '/data/' + modelName;

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
  var backboneModelTemplate = _.template(fs.readFileSync(path.join(__dirname, '/templates/backbone-model.js')));

  //Create the Backbone.Model file content
  var backboneModelString = backboneModelTemplate({
    name: modelName,
    modelData: JSON.stringify(clientModel)
  });

  //Minifies the file content
  backboneModelString = jsmin(backboneModelString);

  var modelPath = path.join(app.root, '/app/static/backbone-models/gen/' + modelName + '.js');

  //Create the Backbone model file
  fs.writeFile(modelPath, backboneModelString, function(err) {
    if(err) {
      app.log.error(err);
      throw err;
    }
  });
};


module.exports = generateModels;