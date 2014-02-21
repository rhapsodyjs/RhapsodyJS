'use strict';

var responseUtils = require('../responseUtils');;

/**
 * Binds the routes for REST access
 * Response codes based on
 * http://developer.yahoo.com/social/rest_api_guide/http-response-codes.html
 *
 * TODO:
 * 401 response code if access to model needs authentication
 */
  
var RestRouter = function RestRouter(rhapsodyApp) {
  this.app = rhapsodyApp.app;
};

RestRouter.prototype = {

  route: function() {
    this.app.post('/data/:model', this.create);
    this.app.get('/data/:model/:id?', this.read);
    this.app.put('/data/:model/:id', this.update);
    this.app.del('/data/:model/:id', this.del);
  },

  create: function create(req, res) {
    var mongoModel = Rhapsody.requireModel(req.params.model);

    if(!mongoModel) {
      return responseUtils.respond(res, 400); //Malformed syntax or a bad query
    }

    var dataToCreate = req.body;
    //Creates the new data and populates with the post fields
    var newData = new mongoModel(dataToCreate);
    newData.save(function createData(err) {
      if(err) {
        if(err.name === 'ValidationError') {
          responseUtils.respond(res, 400); //Malformed syntax or a bad query
        }
        responseUtils.respond(res, 500); //Internal server error
      }
      else {
       responseUtils.json(res, 201, newData); //Sucessful creation
      }
    });
  },

  read: function read(req, res) {
    var mongoModel = Rhapsody.requireModel(req.params.model);

    if(!mongoModel) {
      return responseUtils.respond(res, 400); //Malformed syntax or a bad query
    }

    //If id not specified, return all data from the model
    if(typeof req.params.id === 'undefined') {
      mongoModel.find({}, function readAllData(err, data) {
        if(err) {
          responseUtils.respond(res, 500); //Internal server error
        }
        else {
          responseUtils.json(res, 200, data); //No error, operation successful
        }
      });
    }
    else {
      mongoModel.findOne({_id: req.params.id}, function readData(err, data) {
        if(err) {
          responseUtils.respond(res, 500); //Internal server error
        }
        else {
          if(data === null) {
            responseUtils.respond(res, 404); //Resource not found
          }
          else {
            responseUtils.json(res, 200, data); //No error, operation successful
          }
        }
      });
    }
  },

  update: function update(req, res) {
    var mongoModel = Rhapsody.requireModel(req.params.model);

    if(!mongoModel) {
      return responseUtils.respond(res, 400); //Malformed syntax or a bad query
    }

    var dataToUpdate = req.body;
    mongoModel.update({_id: req.params.id}, dataToUpdate, function updateData(err, data) {
      if(err) {
        if(err.name === 'ValidationError') {
          responseUtils.respond(res, 400); //Malformed syntax or a bad query
        }
        responseUtils.respond(res, 500); //Status code for service error on server
      }
      else {
        responseUtils.respond(res, 202); //The request was received
      }
    });
  },

  del: function del(req, res) {
    var mongoModel = Rhapsody.requireModel(req.params.model);

    if(!mongoModel) {
      return responseUtils.respond(res, 400); //Malformed syntax or a bad query
    }

    mongoModel.remove({_id: req.params.id}, function deleteData(err) {
      if(err) {
        responseUtils.respond(res, 500); //Status code for service error on server
      }
      else {
        responseUtils.respond(res, 202); //The request was received
      }
    });
  }

};

module.exports = RestRouter;