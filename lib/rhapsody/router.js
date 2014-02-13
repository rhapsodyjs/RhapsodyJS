'use strict';

var fs = require('fs'),
    _ = require('lodash'),
    responses = require('./responses'),
    slugg = require('slugg');

var Router = {

  /**
   * Create all the routes
   * @param  {Express} app An Express app
   */
  routeControllers: function routeController(app) {

    // Define the path for the root of the server

    var mainController = require(Rhapsody.root + '/controllers/' + Rhapsody.defaults.routes.mainController + '/' + Rhapsody.defaults.routes.mainController),
        views = mainController.views, 
        controllerInfo = {path: Rhapsody.root + '/controllers/' + Rhapsody.defaults.routes.mainController};

    Router.bind(mainController.mainView || Rhapsody.defaults.routes.mainView,
      views[mainController.mainView || Rhapsody.defaults.routes.mainView],
      controllerInfo,
      '',
      app,
      '/?');

    //Create all the other routes based on BFS

    var queue = [],
        currentController,
        exploringFirstLevelControllers = true,
        folderRegex = /^[^\s.]+$/,
        files;

    queue.push({
      path: Rhapsody.root, // The path for the controller file
      subs: []    // The subpaths to be routed (like: if the URL is localhost/controller/subcontroller, the subs gonna be ['controller', 'subcontroller'])
    });

    while(queue.length !== 0) {
      currentController = queue.shift();

      if(!exploringFirstLevelControllers) { //Don't look for the controller file in the first iteraction
        Router.routeSingleController(app, currentController); //Routes the currentController controller
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
   * @param  {Express} app            An Express app
   * @param  {Object} controllerInfo  Contains the subs and the path for the controller
   */
  routeSingleController: function routeSingleController(app, controllerInfo) {
    var controller = require(controllerInfo.path + '/' + controllerInfo.subs[controllerInfo.subs.length - 1]),
        views = controller.views,
        subs = controllerInfo.subs.join('/');

    for(var v in views) {
      if(views.hasOwnProperty(v)) {
        var view = views[v];

        Router.bind(v, view, controllerInfo, subs, app);

      }
    }

    //Routes the controller root
    Router.bind(controller.mainView || Rhapsody.defaults.routes.mainView, 
      views[controller.mainView || Rhapsody.defaults.routes.mainView],
      controllerInfo,
      subs,
      app,
      '/' + subs + '/?');
  },

  /**
   * Binds a route
   * @param  {String} viewName        The name of the view. Optionally containing its verb
   * @param  {*} view                 A string, object or function with the view
   * @param  {Object} controllerInfo  Contains the subs and the path for the controller
   * @param  {String} subs            The subpaths to this view
   * @param  {Express} app            An Express app
   * @param  {String} routingPath     Optional. The path that's going to be routed.
   */
  bind: function bind(viewName, view, controllerInfo, subs, app, routingPath) {
    var viewPath,
        verb;

    //Check if the view has a custom verb
    //If not, set is as GET
    var action = viewName.split(/\s+/g);
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
      app[verb](routingPath, view.action);
    }
    //If the path doesn't accept parameters
    else if(typeof view === 'function') {
      app[verb](routingPath, view);
    }
    //If it's the path to a static file
    else if(typeof view === 'string') {
      var realPath = controllerInfo.path + '/views/' + view;
      app[verb](routingPath, function(req, res) {
        res.sendfile(realPath);
      });
    }
  },

  /**
   * Binds the routes for REST access
   * @param  {Express} app An Express app
   */
  routeModelsREST: function routeModelsREST(app) {
    var model,
        modelName,
        mongoModel;

    fs.readdirSync(Rhapsody.root + '/models').forEach(function(file) {
      modelName = file.substring(0, file.length - 3);
      model = Rhapsody.requireModel(modelName, true);
      mongoModel = model.serverModel;

      //Test if the current model didn't disallowed REST URLs
      if((typeof model.options.allowREST === 'undefined') || model.options.allowREST) {

        /**
         * Response codes based on
         * http://developer.yahoo.com/social/rest_api_guide/http-response-codes.html
         */
        
        /* CREATE */
        app.post('/data/' + modelName, function create(req, res) {
          var dataToCreate = req.body;
          //Creates the new data and populates with the post fields
          var newData = new mongoModel(dataToCreate);
          newData.save(function createData(err) {
            if(err) {
              responses.respond(res, 500); //Internal server error
            }
            else {
             responses.json(res, 201, newData); //Sucessful creation
            }
          });
        });

        /* READ */
        app.get('/data/' + modelName + '/:id?', function read(req, res) {
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
        app.put('/data/' + modelName + '/:id', function update(req, res) {
          var dataToUpdate = req.body;
          mongoModel.update({_id: req.params.id}, dataToUpdate, function updateData(err, data) {
            if(err) {
              responses.respond(res, 500); //Status code for service error on server
            }
            else {
              responses.respond(res, 202); //The request was received
            }
          });
        });

        /* DELETE */
        app.del('/data/' + modelName + '/:id', function del(req, res) {
          mongoModel.remove({_id: req.params.id}, function removeData(err) {
            if(err) {
              responses.respond(res, 500); //Status code for service error on server
            }
            else {
              responses.respond(res, 202); //The request was received
            }
          });
        });

      }

    });
  }
};

module.exports = Router;