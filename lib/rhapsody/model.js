'use strict';

var fs = require('fs-extra'),
    _ = require('lodash'),
    path = require('path'),
    Schema = require('jugglingdb').Schema;

/**
 * Models can have the following attributes:
 * - attributes (just type, or the following)
 *    - type
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
 * - relationships
 *   - name
 *     - type
 *     - with
 *     - foreignKey
 *
 * If it's using MongoDB adapter, should not define the foreignKey field in the attributes
 */

/**
 * Model constructor
 * @constructor
 * @param {String} name   Name of the model
 * @param {Object} config The object with model info
 */
var Model = function Model(name, config) {
  this.name = name.toLowerCase();
  this.attributes = config.attributes;
  this.options = config.options;
  this.relationships = config.relationships;
  this.serverModel = config.serverModel;
  this.restrictedAttributes = config.restrictedAttributes;

  return this;
}

Model.prototype = {
  /**
   * Generate all the relationships of the model
   * @param  {Rhapsody} rhapsodyApp
   */
  createRelationships: function createRelationships(rhapsodyApp) {
    var relationshipName,
        relationships,
        relationship,
        relatedModel;

    if(this.relationships && Object.keys(this.relationships).length > 0) {

      relationships = this.relationships;

      for(relationshipName in relationships) {
        relationship = relationships[relationshipName];
        //If it's a valid relationship
        if(this.serverModel[relationship.type]) {
          relatedModel = rhapsodyApp.requireModel(relationship['with']);

          //If the related model actually exists
          if(relatedModel) {
            //Creates the relationship with JugglingDB API
            
            if(relationship.type === 'hasAndBelongsToMany') {
              this.serverModel.hasAndBelongsToMany(relationshipName, {
                model: relatedModel
              });
            }
            else {
              this.serverModel[relationship.type](relatedModel, {
                as: relationshipName,
                foreignKey: relationship.foreignKey
              });
            }

          }
          else {
            rhapsodyApp.log.error('Relationship error', '"' + relationship['with'] + '" related with "' + this.name + '" does not exist.');
          }
        }
        else {
          rhapsodyApp.log.error('Relationship error', relationship.type + ' in "' + this.name + '" is not a valid relationship');
        }
      }
    }
  } 
};

/**
 * Generate client and server-side models
 * @static
 */
Model.generateModels = function generateModels(rhapsodyApp, buildBackboneModels) {
  var jsFileRegex = /^\w+\.js$/i;

  var modelsPath = path.join(rhapsodyApp.root, '/app/models'),
      backboneModelsPath = path.join(rhapsodyApp.root, rhapsodyApp.clientModelsPath);


  //Create all the schemas based on the adapters
  Model.createSchemas(rhapsodyApp);

  //If the Backbone models are going to be generated
  // remove the "gen" folder and create it again
  if(buildBackboneModels) {
    try {
      fs.removeSync(backboneModelsPath);
      fs.mkdirSync(backboneModelsPath);
    }
    catch(err) {
      rhapsodyApp.log.error(err);
      throw err;
    }
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

          //Creates a copy of the attributes without the serverValidations array, the restricted and the required flag
          serverAttributes[attr] = _.omit(modelAttributes[attr], ['serverValidations', 'restricted', 'required']);

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

      var serverModel = Model.generateServerModel(rhapsodyApp, modelName, serverAttributes, serverValidations, requiredModel);

      //If, during the build, the Backbone models must be generated
      if((typeof rhapsodyApp.config.generateClientModels === 'undefined' || rhapsodyApp.config.generateClientModels) && buildBackboneModels) {
        Model.generateClientModel(rhapsodyApp, modelName, clientDefaults, requiredModel);
      }

      //Saves the model data
      rhapsodyApp.models[modelName.toLowerCase()] = new Model(modelName, {
        attributes: requiredModel.attributes,
        options: requiredModel.options,
        relationships: requiredModel.relationships,
        serverModel: serverModel,
        restrictedAttributes: restrictedAttributes
      });

    }
  });

  //Creates all relationships
  Model.createRelationships(rhapsodyApp);

};

/**
 * Creates all relationships
 * @static
 * @param  {Rhapsody} rhapsodyApp
 */
Model.createRelationships = function createRelationships(rhapsodyApp) {
  var fullModel,
      modelName;

  for(modelName in rhapsodyApp.models) {
    fullModel = rhapsodyApp.models[modelName];

    fullModel.createRelationships(rhapsodyApp);
  }
};


/**
 * Generate a single server model
 * @static
 * @param  {String} modelName
 * @param  {Object} serverAttributes The attributes the model will have
 * @param  {Array} serverValidations      Array of validation names
 * @param  {Object} requiredModel    The generic model
 * @param {Rhapsody} rhapsodyApp A Rhapsody app
 * @return {JugglingDB Model}
 */
Model.generateServerModel = function generateServerModel(rhapsodyApp, modelName, serverAttributes, serverValidations, requiredModel) {
  var attr,
      validation,
      validationFunctions = {};

  //For each attribute that needs validation
  for(attr in serverValidations) {
    validationFunctions[attr] = [];
    //For each validation for that attribute
    for(validation in serverValidations[attr]) {
      //Get the validation function in the serverMethods
      var validationFunction = requiredModel.serverMethods[serverValidations[attr][validation]];
      validationFunctions[attr].push(validationFunction);
    }
  }

  //Gets the schema of the model
  var schema = rhapsodyApp.schemas[requiredModel.options.adapter || rhapsodyApp.config.database.defaultAdapter];

  //Creates the new model
  var serverModel = schema.define(modelName, serverAttributes);

  //Sets all validations to the model
  for(attr in validationFunctions) {
    //Sets each validation of each attribute
    for(validation in validationFunctions[attr]) {
      serverModel.validate(attr, validationFunctions[attr][validation]);
    }
  }

  //Sets the required attributes
  for(attr in requiredModel.attributes) {
    if(typeof requiredModel.attributes[attr] === 'object' && requiredModel.attributes[attr].required) {
      serverModel.validatesPresenceOf(attr);
    }
  }
  
  //Merge shared methods first, so it can be overwriten by specific server methods
  serverModel.prototype = _.merge(serverModel.prototype, requiredModel.sharedMethods);
  serverModel.prototype = _.merge(serverModel.prototype, requiredModel.serverMethods);

  return serverModel;
}

/**
 * Generate a client model
 * @static
 * @param  {String} modelName      
 * @param  {Array} clientDefaults Array of default values of any attribute
 * @param  {Object} requiredModel  The generic model
 * @param  {Rhapsody} rhapsodyApp            A Rhapsody app
 */
Model.generateClientModel = function generateClientModel(rhapsodyApp, modelName, clientDefaults, requiredModel) {
  var urlRoot = '/data/' + modelName;

  //Possible fields of a Backbone.Model
  var clientModel = {
    idAttribute: 'id',
    urlRoot: urlRoot,
    defaults: clientDefaults
  };

  //Stringify all the model data, but not the methods, and remove the closing '}' that
  //will be included after the methods be concatenated
  //We do it because JSON.stringify ignores the functions
  var modelData = JSON.stringify(clientModel);
  modelData = modelData.substring(0, modelData.length - 1) + ', ';

  //Merge shared methods first, so it can be overwriten by specific client methods
  var modelMethods = requiredModel.sharedMethods;
  modelMethods = _.merge(modelMethods, requiredModel.clientMethods);

  _.forIn(modelMethods, function(method, methodName) {
    modelData += '\"' + methodName + '\": ' + method.toString() + ',\n';
  });


  //Remove the last comma and '\n' then closes the '}'
  modelData = modelData.substring(0, modelData.length - 2) + '}';

  //Lodash template for Backbone.Model
  var backboneModelTemplate = _.template(fs.readFileSync(path.join(__dirname, '/templates/backbone-model.js')));

  //Create the Backbone.Model file content
  var backboneModelString = backboneModelTemplate({
    name: modelName,
    modelData: modelData
  });

  //Minifies the file content
  backboneModelString = rhapsodyApp.libs.jsmin(backboneModelString);

  var modelPath = path.join(rhapsodyApp.root, '/app/public/models/gen/' + modelName + '.js');

  //Create the Backbone model file
  fs.writeFile(modelPath, backboneModelString, function(err) {
    if(err) {
      rhapsodyApp.log.error(err);
      throw err;
    }
  });
};

/**
 * Create all schemas based in the adapters
 * @static
 * @param  {Rhapsody} rhapsodyApp
 */
Model.createSchemas = function createSchemas(rhapsodyApp) {
  rhapsodyApp.schemas = {};

  var adapters = rhapsodyApp.config.adapters,
    adapter,
    options;

  for(adapter in adapters) {
    options = _.omit(adapters[adapter], 'lib');

    rhapsodyApp.schemas[adapter] = new Schema(adapters[adapter].lib, options);
  }
}


module.exports = Model;