'use strict';

module.exports = function rhapsody(root, buildBackboneModels) {

  var express = require('express'),
      app = express(),
      server;

  global.Rhapsody = global.Rhapsody || require('./rhapsody/globalRhapsody')(root);

  var router = require('./rhapsody/router');

  //Only connects and generate models if database is enabled
  if(Rhapsody.config.db.active) {
    Rhapsody.database = require('mongoose');
    try {
      Rhapsody.dbConnection = Rhapsody.database.createConnection(Rhapsody.config.db.host, Rhapsody.config.db.name);
    }
    catch(e) {
      console.error(e.message);
    }
    //Put the models in the global Rhapsody.models
    Rhapsody.generateModels(buildBackboneModels);
  }

  //Configure express options
  app.configure(function() {
    app.use(express.json()); //Parses the request body to JSON
    app.use(express.cookieParser(Rhapsody.defaults.cookies.secret)); //Actives cookie support
    app.use(express.cookieSession({secret: Rhapsody.defaults.cookies.sessionSecret})); //Actives session support
    app.use('/static', express.static(Rhapsody.root + '/static'));
    app.use('/backboneModels', express.static(Rhapsody.root + '/backboneModels'));
  });

  router.routeControllers(app);
  if(Rhapsody.defaults.routes.allowREST) {
    router.routeModelsREST(app);
  }

  return {
    open: function(port, callback) {
      server = app.listen(port);
      Rhapsody.log.info('Listening port ' + port);
      
      if(callback) {
        callback(server);
      }

      return server;
    },

    close: function(callback) {
      server.close(callback);
      Rhapsody.log.warn('Server closed');
    }
  }

};
