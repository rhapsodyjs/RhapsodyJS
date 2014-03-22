'use strict';

var path = require('path'),
    _ = require('lodash'),
    Wolverine = require('wolverine'),
    Logger = new Wolverine(Wolverine.DEBUG);

var Rhapsody = function Rhapsody(options) {
  var self = this,
  ControllerRouter = require('./rhapsody/router/controllerRouter'),
  ModelRouter = require('./rhapsody/router/modelRouter');

  this.express = require('express');
  this.app = this.express();
  //Save the server instance, so it can be used for with Socket.io
  this.server = require('http').createServer(this.app);
  
  this.root = options.root;

  this.router = {
    controllerRouter: new ControllerRouter(this),
    modelRouter: new ModelRouter(this)
  };

  this.config = require(path.join(options.root, '/app/config/config'));

  //Get the general environment settings
  this.config = _.merge(this.config, require(path.join(options.root, '/app/config/envs/all')));

  //Overwrite it with the defined environment settings
  this.config = _.merge(this.config, require(path.join(options.root, '/app/config/envs/' + this.config.environment)));

  //Then extends it with the other settings
  this.config = _.merge(this.config, {
    session: require(path.join(options.root, '/app/config/session')),
    templateEngines: require(path.join(options.root, '/app/config/template-engines')),
    error: require(path.join(options.root, '/app/config/error/error')),
    options: options
  });

  this.callbacks = {
    bootstrap: require(path.join(this.root, '/app/config/bootstrap')),
    socket: require(path.join(this.root, '/app/config/socket'))
  };

  this.log = require('./rhapsody/logger')(this.config.log);


  //If some uncaufh exception occurs, print it and then kill the process
  process.on('uncaughtException', function(err){
      self.log.fatal(err);
      process.exit(1);
  });

  this.models = {};

  //Expose object as global
  //Should fix it latter
  global.Rhapsody = this;

};

Rhapsody.prototype = {
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
  configure: function configure(finishedBootstrap) {
    var self = this;
    var sessionIDKey = this.config.session.sessionIDKey || 'sessionID';

    //If database is enabled, configure it
    if(this.config.database.enabled) {
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
    this.app.disable('x-powered-by'); //Disables the 'X-Powered-By: Express' on the HTTP header
    this.app.use(this.express.json()); //Parses the request body to JSON
    this.app.use(this.express.urlencoded()); //Actives URL encoded support

    var usingSignedCookie;
    var maxAge = this.config.session.maxAge;

    if(this.config.session.cookiesSecret) {
      usingSignedCookie = true;
      this.app.use(this.express.cookieParser(this.config.session.cookiesSecret)); //Actives signed cookie support
    }
    else {
      usingSignedCookie = false;
      this.app.use(this.express.cookieParser()); //Actives unsigned cookie support
    }

    //Refreshes the cookie time
    this.app.use(function(req, res, next) {
      var cookieID;

      if(usingSignedCookie) {
        cookieID = req.signedCookies[sessionIDKey];
      }
      else {
        cookieID = req.cookies[sessionIDKey];
      }

      if(cookieID) {
        res.cookie(sessionIDKey, cookieID, {
          httpOnly: true,
          signed: usingSignedCookie,
          maxAge: maxAge
        });
      }

      next();
    });

    this.app.use(this.express.session({ //Actives session support
      secret: this.config.session.sessionSecret,
      key: sessionIDKey,
      cookie: {
        httpOnly: true,
        maxAge: maxAge
      }
    }));

    //Uses consolidate to support the template engines
    var engineRequires = this.config.templateEngines.engines,
        engines = require('./utils/consolidate')(engineRequires),
        templateEngines = this.config.templateEngines.engines;

    this.app.set('view engine', this.config.templateEngines.defaultEngine); //Set the default view engine

    //Require all the registered view engines
    for(var engine in templateEngines) {
      this.app.engine(templateEngines[engine].extension, engines[engine]);
    }

    //Configure the controller routes
    this.router.controllerRouter.route();

    //Configure the RESTful API routes
    if(this.config.routes.allowREST) {
      this.router.modelRouter.route();
    }

    this.app.use(this.express.static(this.root + '/app/public')); //Static files should be here
    this.app.use(this.config.error.error404Handler);
    this.app.use(this.config.error.error500Handler);

    this.callbacks.bootstrap(this, finishedBootstrap);
  },

  open: function open(callback) {
    var self = this;
    var runServer = function runServer() {
      if(self.config.socket.enabled) {

        //Creates and configure the Socket server
        var io = require('socket.io').listen(self.server, {
          logger: self.log,
          'log level': self.log.level
        });

        //Use the config/socket.js file
        self.callbacks.socket(io, self.config.socket);
      }

      var port = self.config.port;
      self.server.listen(port);
      Logger.info('Listening port ' + port);

      if(callback) {
        callback(this.server);
      }
    };

    //Configure the server before run it
    this.configure(runServer);
  },

  close: function close() {
    this.server.close();
    Logger.warn('Server closed');
  }
};


module.exports = Rhapsody;
