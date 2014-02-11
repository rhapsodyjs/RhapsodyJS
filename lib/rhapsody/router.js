var fs = require('fs');
var _ = require('lodash');

var Router = {

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

        Router.createRoute(v, view, controllerInfo, subs, app);

      }
    }

    //Routes the controller root
    Router.createRoute(controller.mainView || Rhapsody.defaults.routes.mainView, 
      views[controller.mainView || Rhapsody.defaults.routes.mainView],
      controllerInfo,
      subs,
      app,
      '/' + subs + '/?');
  },

  /**
   * Creates a rout
   * @param  {String} viewName        The name of the view. Optionally containing its verb
   * @param  {*} view                 A string, object or function with the view
   * @param  {Object} controllerInfo  Contains the subs and the path for the controller
   * @param  {String} subs            The subpaths to this view
   * @param  {Express} app            An Express app
   * @param  {String} routingPath     Optional. The path that's going to be routed.
   */
  createRoute: function createRoute(viewName, view, controllerInfo, subs, app, routingPath) {
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
   * Create all the routes
   * @param  {Express} app An Express app
   */
  routeControllers: function routeController(app) {

    // Define the path for the root of the server

    var mainController = require(Rhapsody.root + '/controllers/' + Rhapsody.defaults.routes.mainController + '/' + Rhapsody.defaults.routes.mainController),
        views = mainController.views, 
        controllerInfo = {path: Rhapsody.root + '/controllers/' + Rhapsody.defaults.routes.mainController};

    Router.createRoute(mainController.mainView || Rhapsody.defaults.routes.mainView,
      views[mainController.mainView || Rhapsody.defaults.routes.mainView],
      controllerInfo,
      '',
      app,
      '/?');

    //Create all the other routes based on BFS

    var queue = [],
        current,
        firstIteration = true;

    queue.push({
      path: Rhapsody.root, // The path for the controller file
      subs: []    // The subpaths to be routed (like: if the URL is localhost/controller/subcontroller, the subs gonna be ['controller', 'subcontroller'])
    });

    var folderRegex = /^[^\s.]+$/;

    while(queue.length !== 0) {
      current = queue.shift();

      if(firstIteration) { //Don't look for the controller file in the first iteraction
        firstIteration = false;
      }
      else {
        Router.routeSingleController(app, current); //Routes the current controller
      }

      try {
        //Read all subcontrollers and put in on the queue to be routed
        fs.readdirSync(current.path + '/controllers').forEach(function(file) {

          if(folderRegex.test(file)) {

            var newPath = current.path + '/controllers/' + file,
              newSubs = _.cloneDeep(current.subs);
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
      }

    }

  }
};

module.exports = Router;