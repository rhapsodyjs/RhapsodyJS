'use strict';

var fs = require('fs-extra'),
	_ = require('lodash'),
	path = require('path'),
	Schema = require('jugglingdb').Schema,
	utils = require('../utils');

/**
 * Model constructor
 * @constructor
 * @param {String} name   Name of the model
 * @param {Object} config The object with model info
 */
function Model(name, config) {
	this.name = name;

	utils.defaultsDeep(config, {
		attributes: {},
		sharedMethods: {},
		clientMethods: {},
		serverMethods: {},
		hooks: {},
		options: {
			allowREST: true,
			middlewares: [],
			generateClientModel: true,
			hooks: {}
		},
		relationships: {}
	});

	//Copy all configs to the model object
	for(var c in config) {
		if(config.hasOwnProperty(c)) {
			this[c] = config[c];
		}
	}

	return this;
}

Model.prototype = {
  /**
   * Generate all the relationships of the model
   * @param  {Rhapsody} rhapsodyApp
   */
	createRelationships: function createRelationships(rhapsodyApp) {

		var relationshipModel,
			relationshipName,
			relationship,
			relatedModel;

		this.relationships = this.relationships || {};

		for(relationshipName in this.relationships) {
			relationship = this.relationships[relationshipName];
			//If it's a valid relationship
			if(this.serverModel[relationship.type]) {
				relatedModel = rhapsodyApp.requireModel(relationship['with']);

				//If the user sets the relationship model, pass it
				//otherwise, just pass false and JugglingDB will generate it
				relationshipModel = rhapsodyApp.requireModel(relationship.through);

				//If the related model actually exists
				if(relatedModel) {
					//Creates the relationship with JugglingDB API

					if(relationship.type === 'hasAndBelongsToMany') {
						this.serverModel.hasAndBelongsToMany(relationshipName, {
							model: relatedModel,
							through: relationshipModel
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
					utils.Logger.error('Relationship error', '"' + relationship['with'] + '" related with "' + this.name + '" does not exist.');
				}
			}
			else {
				utils.Logger.error('Relationship error', relationship.type + ' in "' + this.name + '" is not a valid relationship');
			}
		}
	},

	hasRelationship: function hasRelationship(relationship) {
		return (typeof this.relationships[relationship] !== 'undefined');
	}
};

/**
 * Generate server-side models
 * @static
 */
 Model.generateModels = function generateModels(rhapsodyApp) {
	var modelsPath = path.join(rhapsodyApp.root, '/app/models');

	//Create all the schemas based on the adapters
	Model.createSchemas(rhapsodyApp);

	fs.readdirSync(modelsPath).forEach(function(file) {
		if(utils.jsFileRegex.test(file)) {

			var serverAttributes = {},
				serverValidations = {},
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
				}
				//If it just has the type, just put it on the attributes
				else {
					serverAttributes[attr] = modelAttributes[attr];
				}
			}

			var serverModel = Model.generateServerModel(rhapsodyApp, modelName, serverAttributes, serverValidations, requiredModel);

			//Saves the model data
			rhapsodyApp.models[modelName] = new Model(modelName, {
				attributes: requiredModel.attributes,
				options: requiredModel.options,
				relationships: requiredModel.relationships,
				serverModel: serverModel,
				restrictedAttributes: restrictedAttributes,
				hooks: requiredModel.hooks
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

		//Remove the method of the object
		delete fullModel.createRelationships;
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
	var validationFunctions = {},
		serverModel,
		validation,
		schema,
		hooks,
		hook,
		attr;

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
	schema = rhapsodyApp.schemas[requiredModel.options.adapter || rhapsodyApp.config.database.defaultAdapter];

	//Creates the new model
	serverModel = schema.define(modelName, serverAttributes);

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

	hooks = requiredModel.hooks || {};

	//Create the hooks
	for(hook in hooks) {
		serverModel[hook] = hooks[hook];
	}

	return serverModel;
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
};

module.exports = Model;