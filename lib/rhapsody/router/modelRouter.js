'use strict';

var responseUtils = require('../responseUtils'),
    _ = require('lodash'),
    path = require('path');

/**
 * Returns a full model or, if it doesn't exist, send a status 400 message.
 * @param  {HTTPResponse} res       Object to send the "status 400" message to the user
 * @param  {String} modelName Name of the required model
 * @return {Mix}           Model, if the model exists, or false otherwise.
 */
var getModel = function getModel(res, modelName) {
  var fullModel = Rhapsody.requireModel(modelName, true);

  if(!fullModel) {
    Rhapsody.log.verbose('Nonexistent model', 'Couldn\'t find collection %s', modelName);
    responseUtils.respond(res, 400); //Malformed syntax or a bad query
    return  false;
  }

  return fullModel;
};

/**
 * Given a model and its data, remove what attribute the user wants, except the restrict attributes
 * @param  {Object} data      Object of attributes
 * @param  {RhapsodyModel} fullModel 
 * @param {Array} wantedAttributes The attributes the user wants, defaults to all
 * @return {Object}           The data object, omiting the restrict attributes of the model
 */
var filterAttributes = function filterAttributes(data, fullModel, wantedAttributes) {
  wantedAttributes = wantedAttributes || Object.keys(fullModel.attributes);

  //Send the model id anyway
  if(!_.contains(wantedAttributes), 'id') {
    wantedAttributes.push('id');
  }

  var restrictedAttributes = Object.keys(fullModel.restrictedAttributes),
      filteredData;

  if(_.isArray(data)) {
    filteredData =  _.map(data, function(rawData) {
      rawData = _.omit(rawData, restrictedAttributes);
      return _.pick(rawData, wantedAttributes);
    });
  }
  else {
    filteredData = _.omit(data, restrictedAttributes);
    filteredData = _.pick(filteredData, wantedAttributes);
  }

  return filteredData;
};

/**
 * Binds the routes for REST access
 * Response codes based on
 * http://developer.yahoo.com/social/rest_api_guide/http-response-codes.html
 */
  
var ModelRouter = function ModelRouter(rhapsodyApp) {
  this.app = rhapsodyApp.app;
};

ModelRouter.prototype = {

  route: function route() {
    this.bindMiddlewares();
    this.app.post('/data/:model', this.create);
    this.app.get('/data/:model', this.readMany);
    this.app.get('/data/:model/:id', this.readOne);
    //Both put and patch use the same method
    this.app.put('/data/:model/:id', this.update);
    this.app.patch('/data/:model/:id', this.update);
    this.app.delete('/data/:model/:id', this.del);
  },

  bindMiddlewares: function bindMiddlewares() {
    var modelName,
        model,
        middleware;

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
          this.app.put('/data/' + modelName + '/:id', middleware);
          this.app.patch('/data/' + modelName + '/:id', middleware);
          this.app.delete('/data/' + modelName + '/:id', middleware);
        }
      }
    }
  },

  create: function create(req, res) {
    var fullModel = getModel(res, req.params.model);

    if(!fullModel) {
      return;
    }

    var serverModel = fullModel.serverModel;

    //Remove the id and version field when inserting
    var dataToCreate = _.omit(req.body, ['id', '__v']);
    //Creates the new data and populates with the post fields
    var newData = new serverModel(dataToCreate);
    newData.save(function createData(err) {
      if(err) {
        if(err.name === 'ValidationError') {
          Rhapsody.log.verbose(err);
          responseUtils.respond(res, 400); //Malformed syntax or a bad query
        }
        Rhapsody.log.error(err);
        responseUtils.respond(res, 500); //Internal server error
      }
      else {
        //Gets the data without the restricted attributes
        var filteredData = filterAttributes(newData, fullModel);
        Rhapsody.log.verbose('Data creation', 'New data was added to collection %s', req.params.model);
        responseUtils.json(res, 201, filteredData); //Sucessful creation
      }
    });
  },

  readMany: function readMany(req, res) {
    var fullModel = getModel(res, req.params.model);

    if(!fullModel) {
      return;
    }

    var serverModel = fullModel.serverModel,
        //Get the names of the attributes the user wants
        requiredAttributes = (req.query.attrs ? req.query.attrs.split(',') : undefined);

    serverModel.all(function readAllData(err, data) {
      if(err) {
        Rhapsody.log.error(err);
        responseUtils.respond(res, 500); //Internal server error
      }
      else {
        //Gets the data without the restricted attributes
        var filteredData = filterAttributes(data, fullModel, requiredAttributes);

        Rhapsody.log.verbose('Data reading', 'All data was read from collection %s', req.params.model);
        if(req.query.callback) {
          responseUtils.jsonp(res, 200, filteredData); //No error, operation successful
        }
        else {
          responseUtils.json(res, 200, filteredData); //No error, operation successful
        }
      }
    });
  },

  readOne: function readOne(req, res) {
    var fullModel = getModel(res, req.params.model);

    if(!fullModel) {
      return;
    }

    var serverModel = fullModel.serverModel,
        //Get the names of the attributes the user wants
        requiredAttributes = (req.query.attrs ? req.query.attrs.split(',') : undefined);

    serverModel.find(req.params.id, function readData(err, data) {
      if(err) {
        Rhapsody.log.error(err);
        responseUtils.respond(res, 500); //Internal server error
      }
      else {
        if(data === null) {
          Rhapsody.log.verbose('Data not found', 'Could not find data from collection %s to read it', req.params.model);
          responseUtils.respond(res, 404); //Resource not found
        }
        else {
          //Gets the data without the restricted attributes
          var filteredData = filterAttributes(data, fullModel, requiredAttributes);

          Rhapsody.log.verbose('Data reading', 'Data was read from collection %s', req.params.model);
          if(req.query.callback) {
            responseUtils.jsonp(res, 200, filteredData); //No error, operation successful
          }
          else {
            responseUtils.json(res, 200, filteredData); //No error, operation successful
          }
        }
      }
    });
  },

  update: function update(req, res) {
    var fullModel = getModel(res, req.params.model);

    if(!fullModel) {
      return;
    }

    var serverModel = fullModel.serverModel;

    //Remove the id and version field when updating
    var dataToUpdate = _.omit(req.body, ['id', '__v']);
    serverModel.find(req.params.id, function findDataToUpdate(err, data) {
      if(err) {
        Rhapsody.log.verbose(err);
        responseUtils.respond(res, 500); //Status code for service error on server
      }
      else {
        data.updateAttributes(dataToUpdate, function updateData(updatingErr) {
          if(updatingErr) {
            Rhapsody.log.verbose(err);
            responseUtils.respond(res, 400); //Malformed syntax or a bad query
          }
          else {
            var filteredData = filterAttributes(data, fullModel);

            if(req.method.toLowerCase() === 'put') {
              Rhapsody.log.verbose('Data update', 'Data was updated on collection %s', req.params.model);
            }
            //Otherwise, it's patch
            else {
              Rhapsody.log.verbose('Data patch', 'Data was patched on collection %s', req.params.model);
            }

            responseUtils.respond(res, 202, filteredData); //The request was received
          }
        });
      }
    });
  },

  del: function del(req, res) {
    var fullModel = getModel(res, req.params.model);

    if(!fullModel) {
      return;
    }

    var serverModel = fullModel.serverModel;

    serverModel.find(req.params.id, function deleteData(errFinding, data) {
      if(errFinding) {
        Rhapsody.log.verbose(errFinding);
        responseUtils.respond(res, 500); //Status code for service error on server
      }
      else {
        data.destroy(function(errDestroying) {
          if(errDestroying) {
            Rhapsody.log.verbose(errDestroying);
            responseUtils.respond(res, 500); //Status code for service error on server
          }
          else {
            Rhapsody.log.verbose('Data deletion', 'Data was deleted from collection %s', req.params.model);
            responseUtils.respond(res, 202); //The request was received
          }
        });
      }
    });
  }

};

module.exports = ModelRouter;