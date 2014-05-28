'use strict';

var responseUtils = require('../../responseUtils'),
    _ = require('lodash'),
    path = require('path'),
    filterAttributes = require('./filterAttributes');

/**
 * Binds the routes for REST access
 * Response codes based on
 * http://developer.yahoo.com/social/rest_api_guide/http-response-codes.html
 * @param {Rhapsody} rhapsodyApp
 */
var ModelRouter = function ModelRouter(rhapsodyApp) {
  this.app = rhapsodyApp.app;
};

ModelRouter.prototype = {

  route: function route() {
    this.bindMiddlewares();
    
    this.app.all('/data/:model*', this.getModel);

    this.app.post('/data/:model', this.create);
    this.app.get('/data/:model', this.readMany);
    this.app.get('/data/:model/:id', this.readOne);
    this.app.get('/data/:model/:id/:relationship', this.readRelationship);
    //Both put and patch use the same method
    this.app.put('/data/:model/:id', this.update);
    this.app.patch('/data/:model/:id', this.update);
    this.app.delete('/data/:model/:id', this.del);
  },

  /**
   * Gets the model and save it in the req object
   * @param  {ExpressRequest}   req  
   * @param  {ExpressResponse}   res  
   * @param  {Function} next Pass to the right route
   */
  getModel: function getModel(req, res, next) {
    var fullModel = Rhapsody.requireModel(req.params.model, true);

    if(!fullModel) {
      Rhapsody.log.verbose('Nonexistent model', 'Couldn\'t find collection %s', modelName);
      responseUtils.respond(res, 400); //Malformed syntax or a bad query
      return  false;
    }

    req.fullModel = fullModel;

    next();
  },

  /**
   * Bind the middlewares to the model routes
   */
  bindMiddlewares: function bindMiddlewares() {
    var middleware,
        modelName,
        model;

    for(modelName in Rhapsody.models) {
      model = Rhapsody.models[modelName];
      //If the model has middlewares
      if(typeof model.options !== 'undefined' && _.isArray(model.options.middlewares)) {
        for(var i = 0; i < model.options.middlewares.length; i++) {
          if(typeof model.options.middlewares[i] === 'function') {
            middleware = model.options.middlewares[i];
          }
          else {
            middleware = require(path.join(Rhapsody.root, '/app/middlewares/' + model.options.middlewares[i]));
          }

          this.app.post('/data/' + modelName, middleware);
          this.app.get('/data/' + modelName + '/:id?', middleware);
          this.app.get('/data/' + modelName + '/:id/:relationship', middleware);
          this.app.put('/data/' + modelName + '/:id', middleware);
          this.app.patch('/data/' + modelName + '/:id', middleware);
          this.app.delete('/data/' + modelName + '/:id', middleware);
        }
      }
    }
  },

  create: require('./create'),

  readMany: require('./readMany'),

  readOne: require('./readOne'),

  readRelationship: require('./readRelationship'),

  update: require('./update'),

  del: require('./delete')

};

module.exports = ModelRouter;