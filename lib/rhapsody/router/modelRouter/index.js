'use strict';

var responseUtils = require('../../responseUtils'),
	path = require('path'),
	express = require('express');

/**
 * Binds the routes for REST access
 * Response codes based on
 * http://developer.yahoo.com/social/rest_api_guide/http-response-codes.html
 * @param {Rhapsody} rhapsodyApp
 */
function ModelRouter(rhapsodyApp) {
	this.app = rhapsodyApp.app;
	this.router = express.Router();
}

ModelRouter.prototype = {

	route: function route() {
		this.bindMiddlewares();

		this.router.param('model', this.getModel);
		this.router.param('relationship', this.hasRelationship);

		this.router.post('/:model', this.create);
		this.router.post('/:model/:id/:relationship', this.createOnRelationship);

		this.router.get('/:model', this.readMany);
		this.router.get('/:model/:id', this.readOne);
		this.router.get('/:model/:id/:relationship', this.readRelationship);

		this.router.put('/:model/:id', this.update);
		this.router.patch('/:model/:id', this.partiallyUpdate);

		this.router.delete('/:model/:id', this.del);

		this.app.use('/data/', this.router);
	},

  /**
   * Gets the model and save it in the req object
   * @param  {ExpressRequest}   req
   * @param  {ExpressResponse}   res
   * @param  {Function} next Pass to the next route
   */
	getModel: function getModel(req, res, next, model) {
		var fullModel = Rhapsody.requireModel(model, true);

		if(!fullModel) {
			Rhapsody.log.verbose('Nonexistent model', 'Couldn\'t find collection %s.', model);
			return responseUtils.respond(res, 400); //Malformed syntax or a bad query
		}

		//This model does not allow REST API
		if(!fullModel.options.allowREST) {
			return responseUtils.respond(res, 404);
		}

		req.fullModel = fullModel;

		next();
	},

	/**
	 * Check whether  req.fullModel has relationship
	 * @param  {ExpressRequest}   req
	 * @param  {ExpressResponse}   res
	 * @param  {Function} next         Pass to the next route
	 * @param  {String}   relationship Relationship name
	 */
	hasRelationship: function(req, res, next, relationship) {
		if(req.fullModel.hasRelationship(relationship)) {
			return next();
		}

		return responseUtils.respond(res, 400); //Malformed syntax or a bad query
	},

  /**
   * Bind the middlewares to the model routes
   */
	bindMiddlewares: function bindMiddlewares() {
		var modelName,
			_this = this;

		for(modelName in Rhapsody.models) {

			(function(model) {

				model.options.middlewares.forEach(function(middleware) {
					if(typeof middleware !== 'function') {
						middleware = require(path.join(Rhapsody.root, '/app/middlewares/' + middleware));
					}

					modelName = '/' + modelName;

					_this.router.post(modelName, middleware);
					_this.router.post(modelName + '/:id/:relationship', middleware);
					_this.router.get(modelName + '/:id?', middleware);
					_this.router.get(modelName + '/:id/:relationship', middleware);
					_this.router.put(modelName + '/:id', middleware);
					_this.router.patch(modelName + '/:id', middleware);
					_this.router.delete(modelName + '/:id', middleware);
				});

			}(Rhapsody.models[modelName]));
		}
	},

	create: require('./create'),

	createOnRelationship: require('./createOnRelationship'),

	readMany: require('./readMany'),

	readOne: require('./readOne'),

	readRelationship: require('./readRelationship'),

	update: require('./update'),

	partiallyUpdate: require('./partiallyUpdate'),

	del: require('./delete')

};

module.exports = ModelRouter;