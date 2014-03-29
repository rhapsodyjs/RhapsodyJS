'use strict';

var responseUtils = require('../responseUtils'),
    _ = require('lodash'),
    path = require('path');

/**
 * Binds the routes for REST access
 * Response codes based on
 * http://developer.yahoo.com/social/rest_api_guide/http-response-codes.html
 *
 * TODO:
 * 401 response code if access to model needs authentication
 */
  
var ModelRouter = function ModelRouter(rhapsodyApp) {
  this.app = rhapsodyApp.app;
};

ModelRouter.prototype = {

  route: function route() {
    this.bindMiddlewares();
    this.app.post('/data/:model', this.create);
    this.app.get('/data/:model/:id?', this.read);
    this.app.put('/data/:model/:id', this.update);
    this.app.del('/data/:model/:id', this.del);
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
          this.app.del('/data/' + modelName + '/:id', middleware);
        }
      }
    }
  },

  create: function create(req, res) {
    var serverModel = Rhapsody.requireModel(req.params.model);

    if(!serverModel) {
      Rhapsody.log.verbose('Nonexistent model', 'Couldn\'t find collection %s', req.params.model);
      return responseUtils.respond(res, 400); //Malformed syntax or a bad query
    }

    var dataToCreate = req.body;
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
       Rhapsody.log.verbose('Data creation', 'New data was added to collection %s', req.params.model);
       responseUtils.json(res, 201, newData); //Sucessful creation
      }
    });
  },

  read: function read(req, res) {
    var fullModel = Rhapsody.requireModel(req.params.model, true);

    if(!fullModel) {
      Rhapsody.log.verbose('Nonexistent model', 'Couldn\'t find collection %s', req.params.model);
      return responseUtils.respond(res, 400); //Malformed syntax or a bad query
    }

    var serverModel = fullModel.serverModel,
        restrictedAttributes = Object.keys(fullModel.restrictedAttributes);

    //If id not specified, return all data from the model
    if(typeof req.params.id === 'undefined') {
      serverModel.find({}, function readAllData(err, data) {
        if(err) {
          Rhapsody.log.error(err);
          responseUtils.respond(res, 500); //Internal server error
        }
        else {
          //Gets the data without the restricted attributes
          var filteredData = _.map(data, function(rawData) {
            return _.omit(rawData.toObject(), restrictedAttributes);
          });
          Rhapsody.log.verbose('Data reading', 'All data was read from collection %s', req.params.model);
          responseUtils.json(res, 200, filteredData); //No error, operation successful
        }
      });
    }
    else {
      serverModel.findOne({_id: req.params.id}, function readData(err, data) {
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
            var filteredData = _.omit(data.toObject(), restrictedAttributes);
            Rhapsody.log.verbose('Data reading', 'Data was read from collection %s', req.params.model);
            responseUtils.json(res, 200, filteredData); //No error, operation successful
          }
        }
      });
    }
  },

  update: function update(req, res) {
    var serverModel = Rhapsody.requireModel(req.params.model);

    if(!serverModel) {
      Rhapsody.log.verbose('Nonexistent model', 'Couldn\'t find collection %s', req.params.model);
      return responseUtils.respond(res, 400); //Malformed syntax or a bad query
    }

    var dataToUpdate = req.body;
    serverModel.update({_id: req.params.id}, dataToUpdate, function updateData(err, data) {
      if(err) {
        if(err.name === 'ValidationError') {
          Rhapsody.log.verbose(err);
          responseUtils.respond(res, 400); //Malformed syntax or a bad query
        }
        Rhapsody.log.verbose(err);
        responseUtils.respond(res, 500); //Status code for service error on server
      }
      else {
        Rhapsody.log.verbose('Data update', 'Data was updated on collection %s', req.params.model);
        responseUtils.respond(res, 202); //The request was received
      }
    });
  },

  del: function del(req, res) {
    var serverModel = Rhapsody.requireModel(req.params.model);

    if(!serverModel) {
      Rhapsody.log.verbose('Nonexistent model', 'Couldn\'t find collection %s', req.params.model);
      return responseUtils.respond(res, 400); //Malformed syntax or a bad query
    }

    serverModel.remove({_id: req.params.id}, function deleteData(err) {
      if(err) {
        Rhapsody.log.verbose(err);
        responseUtils.respond(res, 500); //Status code for service error on server
      }
      else {
        Rhapsody.log.verbose('Data deletion', 'Data was deleted from collection %s', req.params.model);
        responseUtils.respond(res, 202); //The request was received
      }
    });
  }

};

module.exports = ModelRouter;