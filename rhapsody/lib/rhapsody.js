'use strict';

var path = require('path');

var Rhapsody = function Rhapsody(options) {

  var Router = require('./rhapsody/router');

  this.express = require('express');
  this.app = this.express();
  
  this.root = options.root;

  this.router = new Router(this);

  this.config = {
    database: require(path.join(options.root, '/config/database')),
    defaults: require(path.join(options.root, '/config/defaults')),
    options: options
  };

  this.models = {};

  //Expose object as global
  //Should fix it latter
  global.Rhapsody = this;

};

Rhapsody.prototype = {
  log: require('./rhapsody/logger'),
  generateModels: require('./rhapsody/models'),

  /**
   * Returns the serverModel or the whole model
   * @param  {String} modelName The name of the model
   * @param  {[Boolean]} full     Optional. Makes return the whole model
   * @return {Model}
   */
  requireModel: function requireModel(modelName, full) {
    if(full) {
      return this.models[modelName];
    }
    return this.models[modelName].serverModel;
  },

  configure: function configure() {
    //If database is enabled, configure it
    if(this.config.database.active) {
      this.database = require('mongoose');
      try {
        this.dbConnection = this.database.createConnection(this.config.database.host, this.config.database.name);
      }
      catch(e) {
        console.error(e.message);
      }

      //Create the models and put it on this.models
      this.generateModels(this, this.config.options.build);
    }

    //Saves a copy of this to use inside this.app.configure()
    var self = this;

    //Configure express options
    this.app.configure(function() {
      self.app.use(self.express.json()); //Parses the request body to JSON
      self.app.use(self.express.cookieParser(self.config.defaults.cookies.secret)); //Actives cookie support
      self.app.use(self.express.cookieSession({secret: self.config.defaults.cookies.sessionSecret})); //Actives session support
      self.app.use('/static', self.express.static(self.root + '/static'));
      self.app.use('/backboneModels', self.express.static(self.root + '/backboneModels'));
    });

    //Configure the routes
    this.router.routeControllers(this.app);
    if(this.config.defaults.routes.allowREST) {
      this.router.routeModelsREST(this.app);
    }
  },

  open: function(callback) {
    //Configure the server before run it
    this.configure();

    var port = this.config.defaults.port;
    this.server = this.app.listen(port);
    this.log.info('Listening port ' + port);

    if(callback) {
      callback(this.server);
    }
  },

  close: function() {
    this.server.close();
    this.log.warn('Server closed');
  }
};


module.exports = Rhapsody;
