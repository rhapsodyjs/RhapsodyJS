'use strict';

var fs = require('fs'),
    _ = require('lodash'),
    path = require('path'),
    Response = require('./response');

/**
 * Gotta remember that:
 *   - A subcontroller should not have the same name of a view of its supercontroller
 *   - A first-level controller should not have the same name of a view of mainController
 */

var ControllerRouter = function(rhapsodyApp) {
  this.app = rhapsodyApp.app;
  this.rhapsody = rhapsodyApp;
}

ControllerRouter.prototype = {

  /**
   * Create all the controller routes
   */
  route: function route() {

    // Define the main controller as the root of the server
    this.routeSingleController({
      path: path.join(this.rhapsody.root, '/app/controllers/' + this.rhapsody.config.routes.mainController),
      subs: []
    }, true);

    //Create all the other routes based on BFS
    var queue = [],
        currentController,
        exploringFirstLevelControllers = true,
        folderRegex = /^[^\s.]+$/,
        files;

    queue.push({
      path: path.join(this.rhapsody.root, '/app'), // The path for the controller folder
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
        files = fs.readdirSync(path.join(currentController.path, '/controllers'));

        if(exploringFirstLevelControllers) {
          exploringFirstLevelControllers = false;

          if(files.indexOf('data') !== -1) {
            var error = new Error('A first-level controller can\'t be named "static"');
            error.name = 'InvalidControllerName';
            this.rhapsody.log.error(error);
          }

        }

        //Read all subcontrollers and put in on the queue to be routed
        files.forEach(function(file) {
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
        if(e.code !== 'ENOENT') {
          this.rhapsody.log.fatal(e);
          process.exit(1);
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
    //Requires the controller to be routed
    var controller = require(controllerInfo.path + '/');

    var views = controller.views,
        subs = controllerInfo.subs.join('/');

    //If the controller has global middlewares
    if(_.isArray(controller.middlewares)) {
      var middleware;
      for(var i = 0; i < controller.middlewares.length; i++) {
        if(typeof controller.middlewares[i] === 'function') {
          middleware = controller.middlewares[i];
        }
        else {
          middleware = require(path.join(this.rhapsody.root, '/app/middlewares/' + controller.middlewares[i]));
        }
        
        //All verbs pass by the middleware
        this.app.all('/' + subs + '/?*', middleware);
      }
    }

    for(var viewName in views) {
      if(views.hasOwnProperty(viewName)) {
        var view = views[viewName];

        //If it's routing the server root, must change
        if(serverRoot) {
          //Workaround for when a root view uses custom verb

          var rootViewAction = viewName.split(':');
          var rootViewName = (rootViewAction.length == 1 ? rootViewAction[0] : rootViewAction[1]);

          if(this.rhapsody.config.routes.allowREST && rootViewName ===  'data') {
            var newError = new Error('A root view controller can\'t be named "data" when RESTful API generator is enabled');
            newError.name = 'InvalidViewName';
            throw newError;
          }

          this.bind(viewName, view, controllerInfo, subs, '/' + rootViewName);
        }
        else {
          this.bind(viewName, view, controllerInfo, subs);
        }

      }
    }


    //Routes the main view of the controller
    this.bind(controller.mainView || this.rhapsody.config.routes.mainView, 
    views[controller.mainView || this.rhapsody.config.routes.mainView],
    controllerInfo,
    subs,
    '/' + subs + '/?');
  },

  /**
   * Binds a route of a view
   * @param  {String} viewName        The name of the view. Optionally containing its verb
   * @param  {*} view                 A string, object or function with the view
   * @param  {Object} controllerInfo  Contains the subs and the path for the controller
   * @param  {String} subs            The subpaths to this view
   * @param  {String} routingPath     Optional. The path that's going to be routed.
   */
  bind: function bind(viewName, view, controllerInfo, subs, routingPath) {
    var viewPath,
        verb,
        params;

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

    //The function that will be binded to the route
    var bindedFuncion;

    //If the view accept options
    if(view != null && typeof view === 'object') {

      //If the path accepts parameters, put it on the URL
      if(typeof view.params !== 'undefined') {
        params = '/' + view.params.join('/');
        routingPath += params;
      }
      else {
        params = '';
      }

      var hasMiddlewares = _.isArray(view.middlewares);

      //If the path has middlewares, bind them
      if(hasMiddlewares) {
        var middlewares = [];
        for(var i = 0; i < view.middlewares.length; i++) {
          if(typeof view.middlewares[i] === 'function') {
            middlewares[i] = view.middlewares[i];
          }
          else {
            middlewares[i] = require(path.join(this.rhapsody.root, '/app/middlewares/' + view.middlewares[i]));
          }

          this.app[verb](routingPath, middlewares[i]);
        }
      }

      //Extract the function to be binded
      bindedFuncion = this.extractFunction(view.action, controllerInfo);

      //Finally binds the path
      this.app[verb](routingPath, bindedFuncion);

      //If the view has customRoutes
      if(_.isArray(view.customRoutes)) {
        var customRoutes = view.customRoutes;

        for(var i = 0; i < customRoutes.length; i++) {
          var pathToBeRouted = customRoutes[i] + params;

          //Binds the middlewares (precached above) before the custom route
          if(hasMiddlewares) {
            for(var i = 0; i < view.middlewares.length; i++) {
              this.app[verb](pathToBeRouted, middlewares[i]);
            }
          }

          //Binds the custom route
          this.app[verb](pathToBeRouted, bindedFuncion);
        }
      }
    }

    //If the view doesn't accept options, extract the function
    else {
      this.app[verb](routingPath, this.extractFunction(view, controllerInfo));
    }
  },

  /**
   * Extract the function to be binded of a view
   * @param  {Object} view The view object
   * @return {Function}      The function to be binded
   */
  extractFunction: function extractFunction(view, controllerInfo) {
    //If it's a function, just return it
    if(typeof view === 'function') {
      var viewArity = view.length;

      if(viewArity === 2) {
        return function(req, res) {
          view(req, new Response(res, controllerInfo.path));
        }
      }
      if(viewArity === 3) {
        return function(req, res, next) {
          view(req, new Response(res, controllerInfo.path), next);
        }
      }
      if(viewArity === 4) {
        return function(err, req, res, next) {
          view(err, req, new Response(res, controllerInfo.path), next);
        }
      }
      
    }
    //If it's just the path to a static file, send it
    else if(typeof view === 'string') {
      var realPath = controllerInfo.path + '/views/' + view;
      return function(req, res) {
        res.sendfile(realPath);
      };
    }
  }
};

module.exports = ControllerRouter;