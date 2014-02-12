var fs = require('fs');
var _ = require('lodash');

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
      model = require(Rhapsody.root + '/models/' + modelName);
      mongoModel = Rhapsody.requireModel(modelName);

      //Test if the current model didn't disallowed REST URLs
      if((typeof model.allowREST === 'undefined') || model.allowREST) {

        //Basic CRUD
        
        /* CREATE */
        app.post('/data/' + modelName + '/create', function(req, res) {
          var newData = new mongoModel(req.query);
          newData.save(function(err) {
            if(err) {
              res.send(503); //Status code for service error on server
            }
            else {
              res.send(200);
            }
          });
        });

        /* READ */
        app.get('/data/' + modelName + '/read/:id?', function(req, res) {
          //If id not specified, return all data from the model
          if(typeof req.params.id === 'undefined') {
            mongoModel.find({}, function foundData(err, data) {
              res.write(JSON.stringify(data));
              res.send();
            });
          }
          else {
            mongoModel.find({_id: req.params.id}, function foundData(err, data) {
              res.write(JSON.stringify(data));
              res.send();
            });
          }
        });

        /* UPDATE */
        app.put('/data/' + modelName + '/create/:id', function(req, res) {

        });

        /* DELETE */
        app.del('/data/' + modelName + '/create/:id', function(req, res) {

        });

        //Create URLs for the custom methods
        //Default verb is GET
        if(typeof model.customMethods !== 'undefined') {

        }

      }

    });
  }
};

module.exports = Router;