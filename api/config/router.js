var fs = require('fs');
var _ = require('lodash');

module.exports = function Router(root) {
  var router = {
    routeController: function routeController(app, c) {
      var controller = require(c.path + '/' + c.subs[c.subs.length - 1]);
      var views = controller.views;

      for(var v in views) {
        if(views.hasOwnProperty(v)) {
          var view = views[v],
              viewPath,
              verb;

          //Check if the view has a custom verb
          //If not, set is as GET
          var action = v.split(/\s+/g);
          if(action.length == 1) {
            viewPath = action[0];
            verb = 'get';
          }
          else {
            viewPath = action[1];
            verb = action[0];
          }

          // The URL that's gonna be routed
          var routingPath = '/' + c.subs.join('/') + '/' + viewPath;

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
            var realPath = c.path + '/views/' + view;
            app[verb](routingPath, function(req, res) {
              res.sendfile(realPath);
            });
          }

        }
      }

      router.createRoute(view, '/' + c.subs.join('/') + '/?', app, c, verb);
    },


    createRoute: function createRoute(view, routingPath, app, c, verb) {
      //Define the path for the root of this controller
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
        var realPath = c.path + '/views/' + view;
        app[verb](routingPath, function(req, res) {
          res.sendfile(realPath);
        });
      }
    },


    route: function route(app) {

      /* Define the path for the root of the server */

      var mainController = require(root + '/controllers/' + rhapsody.defaults.routes.mainController + '/' + rhapsody.defaults.routes.mainController);
      var view = mainController.views[rhapsody.defaults.routes.mainView];

      if(typeof view === 'function') {
        app.get('/', view);
      }
      //If it's a static file
      else if(typeof view === 'string') {
        var realPath = root + '/controllers/' + rhapsody.defaults.routes.mainController + '/views/' + view;
        app.get('/', function(req, res) {
          res.sendfile(realPath);
        });
      }


      /* Create all the other routes based on BFS */

      var queue = [],
          current,
          firstIteration = true;

      queue.push({
        path: root, // The path for the controller file
        subs: []    // The subpaths to be routed (like: if the URL is localhost/controller/subcontroller, the subs gonna be ['controller', 'subcontroller'])
      });

      var folderRegex = /^[^\s.]+$/;

      while(queue.length !== 0) {
        current = queue.shift();

        if(firstIteration) { //Don't look for the controller file in the first iteraction
          firstIteration = false;
        }
        else {
          router.routeController(app, current);
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
  }

  return router;
}