'use strict';

module.exports = function rhapsody(root) {

  var express = require('express'),
      app = express(),
      server;

  global.Rhapsody = global.Rhapsody || require('./rhapsody/globalRhapsody')(root);

  var router = require('./rhapsody/router');

  try {
    Rhapsody.dbConnection = Rhapsody.database.createConnection(Rhapsody.config.db.host, Rhapsody.config.db.name);
  }
  catch(e) {
    console.error(e.message);
  }

  //Put the models in the global Rhapsody.models
  Rhapsody.generateModels();


  //Configure express options
  app.configure(function() {
    app.use(express.json()); //Parses the request body to JSON
    app.use(express.cookieParser(Rhapsody.defaults.cookies.secret)); //Actives cookie support
    app.use(express.cookieSession({secret: Rhapsody.defaults.cookies.sessionSecret})); //Actives session support
    app.use('/static', express.static(Rhapsody.root + '/static'));
  });

  router.routeControllers(app);
  if(Rhapsody.defaults.routes.allowREST) {
    router.routeModelsREST(app);
  }

  return {
    open: function(port, callback) {
      server = app.listen(port);
      Rhapsody.log('Listening port ' + port);
      
      if(callback) {
        callback();
      }

      return server;
    },

    close: function(callback) {
      server.close(callback);
      Rhapsody.log.warn('Server closed');
    }
  }

};
