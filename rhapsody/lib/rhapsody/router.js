'use strict';

var fs = require('fs'),
    _ = require('lodash'),
    responses = require('./responses');

/**
 * Gotta remember that:
 *   - A subcontroller should not have the same name of a view of its supercontroller
 *   - A first-level controller should not have the same name of a view of mainController
 */

var Router = function(rhapsodyApp) {
  this.app = rhapsodyApp.app;
  this.rhapsody = rhapsodyApp;
}

Router.prototype = {

  /**
   * Create all the controller routes
   */
  routeControllers: function routeController() {    

    // Define the main controller as the root of the server
    this.routeSingleController({
      path: this.rhapsody.root + '/controllers/' + this.rhapsody.config.defaults.routes.mainController,
      subs: []
    }, this.rhapsody.config.defaults.routes.mainController);

    //Create all the other routes based on BFS
    var queue = [],
        currentController,
        exploringFirstLevelControllers = true,
        folderRegex = /^[^\s.]+$/,
        files;

    queue.push({
      path: this.rhapsody.root, // The path for the controller folder
      subs: []    // The subpaths to be routed (like: if the URL is localhost/controller/subcontroller, the subs gonna be ['controller', 'subcontroller'])
    });

    while(queue.length !== 0) {
      currentController = queue.shift();

      //Don't look for the controller file in the first iteration
      if(!exploringFirstLevelControllers) { 
        this.routeSingleController(currentController); //Routes the currentController controller
      }

      try {
        //Read all the files and folders of current 'controllers' directory 
        files = fs.readdirSync(currentController.path + '/controllers');

        if(exploringFirstLevelControllers) {
          exploringFirstLevelControllers = false;

          if(files.indexOf('static') !== -1) {
            throw {message: 'A first-level controller can\'t be named "static"', name: 'InvalidControllerName'};
          }
          if(files.indexOf('data') !== -1) {
            throw {message: 'A first-level controller can\'t be named "data"', name: 'InvalidControllerName'};
          }
          if(files.indexOf('backboneModels') !== -1) {
            throw {message: 'A first-level controller can\'t be named "backboneModels"', name: 'InvalidControllerName'};
          }

        }

        files.forEach(function(file) {
          //Read all subcontrollers and put in on the queue to be routed
          if(folderRegex.test(file)) {

            var newPath = currentController.path + '/controllers/' + file,
                newSubs = _.cloneDeep(currentController.subs);
            newSubs.push(file);

            var newSubController = {
              path: newPath,
              subs: newSubs
            };

            queue.push(newSubController);
          }
        });
      }
      catch(e) {
        //Falls here when try to reach controllers that doesn't exist or find controller with invalid name
        if(e.name === 'InvalidControllerName') {
          throw e;
        }
      }

    }

  },

  /**
   * Route all the views of a controller
   * @param  {Object} controllerInfo  Contains the subs and the path for the controller
   * @param {String} serverRoot If it's routing the server root, import serverRoot controller
   */
  routeSingleController: function routeSingleController(controllerInfo, serverRoot) {
    var isServerRoot = typeof serverRoot !== 'undefined';

    if(isServerRoot) {
      var controller = require(controllerInfo.path + '/' + serverRoot);
    }
    else {
      var controller = require(controllerInfo.path + '/' + controllerInfo.subs[controllerInfo.subs.length - 1]);
    }

    var views = controller.views,
        subs = controllerInfo.subs.join('/');

    for(var v in views) {
      if(views.hasOwnProperty(v)) {
        var view = views[v];

        //If it's routing the server root, must change
        if(isServerRoot) {
          //Workaround for when a root view uses custom verb
          var rootViewAction = v.split(':');
          var rootViewName = (rootViewAction.length == 1 ? rootViewAction[0] : rootViewAction[1]);

          if(rootViewName === 'static') {
            throw {message: 'A root view can\'t be named "static"', name: 'InvalidViewName'};
          }
          if(rootViewName ===  'data') {
            throw {message: 'A root view controller can\'t be named "data"', name: 'InvalidViewName'};
          }
          if(rootViewName === 'backboneModels') {
            throw {message: 'A root view controller can\'t be named "backboneModels"', name: 'InvalidViewName'};
          }

          this.bind(v, view, controllerInfo, subs, '/' + rootViewName);
        }
        else {
          this.bind(v, view, controllerInfo, subs);
        }

      }
    }


    //Routes the controller root
    this.bind(controller.mainView || this.rhapsody.config.defaults.routes.mainView, 
    views[controller.mainView || this.rhapsody.config.defaults.routes.mainView],
    controllerInfo,
    subs,
    '/' + subs + '/?');
  },

  /**
   * Binds a route
   * @param  {String} viewName        The name of the view. Optionally containing its verb
   * @param  {*} view                 A string, object or function with the view
   * @param  {Object} controllerInfo  Contains the subs and the path for the controller
   * @param  {String} subs            The subpaths to this view
   * @param  {String} routingPath     Optional. The path that's going to be routed.
   */
  bind: function bind(viewName, view, controllerInfo, subs, routingPath) {
    var viewPath,
        verb;

    //Check if the view has a custom verb
    //If not, set is as GET
    var action = viewName.split(':');
    if(action.length == 1) {
      viewPath = action[0],
      verb = 'get';
    }
    else {
      viewPath = action[1];
      verb = action[0];
    }

    // The URL that's gonna be routed
    routingPath = routingPath || '/' + subs + '/' + viewPath;

    //If the path accept parameters
    if(view != null && typeof view === 'object') {
      routingPath += '/' + view.params.join('/');
      this.app[verb](routingPath, view.action);
    }
    //If the path doesn't accept parameters
    else if(typeof view === 'function') {
      this.app[verb](routingPath, view);
    }
    //If it's the path to a static file
    else if(typeof view === 'string') {
      var realPath = controllerInfo.path + '/views/' + view;
      this.app[verb](routingPath, function(req, res) {
        res.sendfile(realPath);
      });
    }
  },

  /**
   * Binds the routes for REST access
   */
  routeModelsREST: function routeModelsREST() {
    for(var modelName in this.rhapsody.models) {
      var model = this.rhapsody.models[modelName],
          mongoModel = model.serverModel,
          modelURL = '/data/' + modelName;

      //If the user specified a custom urlRoot, use it
      //otherwise, use /data/ModelName
      if(typeof model.options !== 'undefined' && model.options.urlRoot) {
        modelURL = model.options.urlRoot;
      }

      //Test if the current model didn't disallowed REST URLs
      if((typeof model.options === 'undefined' || typeof model.options.allowREST === 'undefined') || model.options.allowREST) {

        /**
         * Response codes based on
         * http://developer.yahoo.com/social/rest_api_guide/http-response-codes.html
         */
        
        /**
         * TODO:
         * 401 response code if access to model needs authentication
         */
        
        /* CREATE */
        this.app.post(modelURL, function create(req, res) {
          var dataToCreate = req.body;
          //Creates the new data and populates with the post fields
          var newData = new mongoModel(dataToCreate);
          newData.save(function createData(err) {
            if(err) {
              if(err.name === 'ValidationError') {
                responses.respond(res, 400); //Malformed syntax or a bad query
              }
              responses.respond(res, 500); //Internal server error
            }
            else {
             responses.json(res, 201, newData); //Sucessful creation
            }
          });
        });

        /* READ */
        this.app.get(modelURL + '/:id?', function read(req, res) {
          //If id not specified, return all data from the model
          if(typeof req.params.id === 'undefined') {
            mongoModel.find({}, function readAllData(err, data) {
              if(err) {
                responses.respond(res, 500); //Internal server error
              }
              else {
                responses.json(res, 200, data); //No error, operation successful
              }
            });
          }
          else {
            mongoModel.findOne({_id: req.params.id}, function readData(err, data) {
              if(err) {
                responses.respond(res, 500); //Internal server error
              }
              else {
                if(data === null) {
                  responses.respond(res, 404); //Resource not found
                }
                else {
                  responses.json(res, 200, data); //No error, operation successful
                }
              }
            });
          }
        });

        /* UPDATE */
        this.app.put(modelURL + '/:id', function update(req, res) {
          var dataToUpdate = req.body;
          mongoModel.update({_id: req.params.id}, dataToUpdate, function updateData(err, data) {
            if(err) {
              if(err.name === 'ValidationError') {
                responses.respond(res, 400); //Malformed syntax or a bad query
              }
              responses.respond(res, 500); //Status code for service error on server
            }
            else {
              responses.respond(res, 202); //The request was received
            }
          });
        });

        /* DELETE */
        this.app.del(modelURL + '/:id', function del(req, res) {
          mongoModel.remove({_id: req.params.id}, function deleteData(err) {
            if(err) {
              responses.respond(res, 500); //Status code for service error on server
            }
            else {
              responses.respond(res, 202); //The request was received
            }
          });
        });

      }

    }
  }
};

module.exports = Router;