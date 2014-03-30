'use strict';

var path = require('path'),
    Wolverine = require('wolverine'),
    Logger = new Wolverine(Wolverine.DEBUG);

var Rhapsody = function Rhapsody(options) {
  //Expose object as global
  //Should fix it latter
  global.Rhapsody = this;

  var self = this,
      ControllerRouter = require('./rhapsody/router/controllerRouter'),
      ModelRouter = require('./rhapsody/router/modelRouter');

  this.libs = {
    express: require('express'),
    cors: require('cors'),
    jsmin: require('jsmin').jsmin,
    lodash: require('lodash'),
    wolverine: require('wolverine')
  };

  this.app = this.libs.express();
  
  this.root = options.root;

  this.router = {
    controllerRouter: new ControllerRouter(this),
    modelRouter: new ModelRouter(this)
  };

  this.config = require(path.join(options.root, '/app/config/config'));

  //Get the general environment settings
  this.config = this.libs.lodash.merge(this.config, require(path.join(options.root, '/app/config/envs/all')));

  //Overwrite it with the defined environment settings
  this.config = this.libs.lodash.merge(this.config, require(path.join(options.root, '/app/config/envs/' + this.config.environment)));

  //Then extends it with the other settings
  this.config = this.libs.lodash.merge(this.config, {
    cors: require(path.join(options.root, '/app/config/cors')),
    error: require(path.join(options.root, '/app/config/error/error')),
    httpsOptions: require(path.join(options.root, '/app/config/https')),
    session: require(path.join(options.root, '/app/config/session')),
    templateEngines: require(path.join(options.root, '/app/config/template-engines')),
    options: options
  });

  this.callbacks = {
    bootstrap: require(path.join(this.root, '/app/config/bootstrap')),
    socket: require(path.join(this.root, '/app/config/socket'))
  };

  this.log = require('./rhapsody/logger')(this.config.log);

  this.servers = {};

  //Configures the HTTP server
  this.servers.http = require('http').createServer(this.app);

  //Configures the HTTPS server
  if(this.config.https.enabled) {    
    this.servers.https = require('https').createServer(this.config.httpsOptions, this.app);
  }

  this.models = {};

  return this;

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
      
      var mongoAddress = 'mongodb://';

      if(typeof this.config.database.username !== 'undefined') {
        mongoAddress += this.config.database.username + ':' + this.config.database.password + '@';
      }

      mongoAddress += this.config.database.host + ':' + this.config.database.port + '/' + this.config.database.name;

      this.dbConnection = this.database.createConnection(mongoAddress);

      //Create the models and put it on this.models
      this.generateModels(this, this.config.options.build);
    }


    //Configure express
    this.app.disable('x-powered-by'); //Disables the 'X-Powered-By: Express' on the HTTP header

    //Actives response compression
    if(this.config.compression.enabled) {
      this.app.use(this.libs.express.compress());
    }

    //Actives HTTP method overriding
    if(this.config.methodOverride.enabled) {
      this.app.use(this.libs.express.methodOverride(this.config.methodOverride.attributeName));
    }

    this.app.use(this.libs.express.json()); //Parses the request body to JSON
    this.app.use(this.libs.express.urlencoded()); //Actives URL encoded support

    //Actives the session/cookie support
    if(this.config.session.enabled) {
      var usingSignedCookie,
          maxAge = this.config.session.maxAge;

      if(this.config.session.cookiesSecret) {
        usingSignedCookie = true;
        this.cookieParser = this.libs.express.cookieParser(this.config.session.cookiesSecret);
        //Actives signed cookie support
        this.app.use(this.cookieParser);
      }
      else {
        usingSignedCookie = false;
        this.cookieParser = this.libs.express.cookieParser();
        //Actives unsigned cookie support
        this.app.use(this.cookieParser);
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

        //Creates a new cookie with the same ID
        //so it refreshes the time
        if(cookieID) {
          res.cookie(sessionIDKey, cookieID, {
            httpOnly: true,
            signed: usingSignedCookie,
            maxAge: maxAge
          });
        }

        next();
      });

      this.config.session.sessionStore = this.config.session.sessionStore || new this.libs.express.session.MemoryStore();

      //Actives session support
      this.app.use(this.libs.express.session({
        secret: this.config.session.sessionSecret,
        key: sessionIDKey,
        cookie: {
          httpOnly: true,
          maxAge: maxAge
        },
        store: this.config.session.sessionStore
      }));
    }

    //Actives CSRF protection
    if(this.config.csrf.enabled) {
      this.app.use(this.libs.express.csrf());
      this.app.use(function (req, res, next) {
        res.locals._csrf = req.csrfToken();
        next();
      });
    }

    //Actives CORS
    if(this.config.cors.enabled) {
      var corsConfig = this.libs.lodash.omit(this.config.cors, 'enabled');
      this.app.use(this.libs.cors(corsConfig));
    }

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

    //Serve the /app/public file as the public folder
    this.app.use(this.libs.express.static(this.root + '/app/public'));

    this.app.use(this.config.error.error404Handler);
    this.app.use(this.config.error.error500Handler);

    this.callbacks.bootstrap(this, finishedBootstrap);
  },

  open: function open() {
    var self = this;
    var runServer = function runServer() {
      var SessionSockets = require('session.socket.io');

      //If socket is enabled for HTTP
      if(self.config.http.socket) {
        var ioHTTP = require('socket.io').listen(self.servers.http, {
          logger: self.log,
          'log level': self.log.level
        });

        var sessionIoHTTP;

        //If session must be used with the session
        if(self.config.session.enabled) {
          sessionIoHTTP = new SessionSockets(ioHTTP, self.config.session.sessionStore, self.cookieParser, self.config.session.sessionIDKey || 'sessionID');
        }
        else {
          sessionIoHTTP = undefined;
        }

        //Use the config/socket.js file
        self.callbacks.socket(ioHTTP, sessionIoHTTP);
      }

      var httpPort = self.config.http.port;

      //Open the HTTP server
      self.servers.http.listen(httpPort);
      Logger.info('Listening HTTP on port ' + httpPort);

      if(self.config.https.enabled) {

        //If socket is enabled for HTTPS
        if(self.config.https.socket) {
          var ioHTTPS = require('socket.io').listen(self.servers.https, {
            logger: self.log,
            'log level': self.log.level
          });

          var sessionIoHTTPS;

          //If session must be used with the session
          if(self.config.session.enabled) {
            sessionIoHTTPS = new SessionSockets(ioHTTPS, self.config.session.sessionStore, self.cookieParser, self.config.session.sessionIDKey || 'sessionID');
          }
          else {
            sessionIoHTTPS = undefined;
          }

          //Use the config/socket.js file
          self.callbacks.socket(ioHTTPS, sessionIoHTTPS);
        }

        var httpsPort = self.config.https.port;

        //Open the HTTPS server
        self.servers.https.listen(httpsPort);
        Logger.info('Listening HTTPS on port ' + httpsPort);
      }

    };

    //Configure the server before run it
    this.configure(runServer);
  },

  close: function close() {
    this.servers.http.close();
    Logger.warn('Server closed');
  }
};


module.exports = Rhapsody;
