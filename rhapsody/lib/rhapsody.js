'use strict';

var path = require('path');

var Rhapsody = function Rhapsody(options) {

  var ControllerRouter = require('./rhapsody/router/controllerRouter');
  var ModelRouter = require('./rhapsody/router/modelRouter');

  this.express = require('express');
  this.app = this.express();
  
  this.root = options.root;

  this.router = {
    controllerRouter: new ControllerRouter(this),
    modelRouter: new ModelRouter(this)
  };

  this.config = {
    database: require(path.join(options.root, '/app/config/database')),
    defaults: require(path.join(options.root, '/app/config/defaults')),
    session: require(path.join(options.root, '/app/config/session')),
    template: require(path.join(options.root, '/app/config/template')),
    error: require(path.join(options.root, '/app/config/error/error')),
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
   * @param  {Boolean} full     Optional. Makes return the whole model
   * @return {Model}
   */
  requireModel: function requireModel(modelName, full) {
    var model = this.models[modelName];

    if(full) {
      return (model ? model : false);
    }
    return (model ? model.serverModel : false);
    
  },

  /**
   * Configure the server before open it
   */
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


    //Configure express
    this.app.use(this.express.json()); //Parses the request body to JSON
    this.app.use(this.express.urlencoded()); //Actives URL encoded support
    this.app.use(this.express.cookieParser(this.config.session.cookiesSecret)); //Actives cookie support
    this.app.use(this.express.session({ //Actives session support
      secret: this.config.session.sessionSecret
    }));

    //Uses consolidate to support the template engines
    var engineRequires = this.config.template.engines,
        engines = require('./utils/consolidate')(engineRequires),
        templateEngines = this.config.template.engines;

    this.app.set('view engine', this.config.template.defaultEngine); //Set the default view engine

    //Require all the registered view engines
    for(var engine in templateEngines) {
      this.app.engine(templateEngines[engine].extension, engines[engine]);
    }

    this.app.use(this.app.router); //Use the custom routes above the static and backbone-models
    this.app.use('/static', this.express.static(this.root + '/app/static')); //Static files should be here
    //Backbone models should be here for facility
    //the generated models will be in /backbone-models/gen/ModelName.js
    this.app.use('/backbone-models', this.express.static(this.root + '/app/backbone-models'));
    this.app.use(this.config.error.error404Handler);

    //Configure the routes
    this.router.controllerRouter.route();
    if(this.config.defaults.routes.allowREST) {
      this.router.modelRouter.route();
    }
  },

  open: function open(callback) {
    //Configure the server before run it
    this.configure();

    var port = this.config.defaults.port;
    this.server = this.app.listen(port);
    this.log.info('Listening port ' + port);

    if(callback) {
      callback(this.server);
    }
  },

  close: function close() {
    this.server.close();
    this.log.warn('Server closed');
  }
};


module.exports = Rhapsody;
