'use strict';

var path = require('path'),
		Wolverine = require('wolverine'),
		Logger = new Wolverine(Wolverine.DEBUG),
		fs = require('fs-extra');

/**
 * RhapsodyJS app class
 * @param {Object} options Options
 * @constructor
 */
var Rhapsody = function Rhapsody(options) {
	//Expose object as global
	//Should fix it latter
	global.Rhapsody = this;

	var self = this,
			ControllerRouter = require('./rhapsody/router/controllerRouter'),
			ModelRouter = require('./rhapsody/router/modelRouter');

	//Libs used internally that the programmer can access
	this.libs = {
		express: require('express'),
		jsmin: require('jsmin').jsmin,
		lodash: require('lodash'),
		wolverine: require('wolverine')
	};

	//Middlewares used internally that the programmer can access
	this.middlewares = require('./rhapsody/middlewares');

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
	var loadConfig = require('./rhapsody/loadConfig');
	this.config = this.libs.lodash.merge(this.config, loadConfig(options));

	this.callbacks = {
		bootstrap: require(path.join(this.root, '/app/config/bootstrap')),
		socket: require(path.join(this.root, '/app/config/socket'))
	};

	this.log = require('./rhapsody/logger')(this.config.log);

	this.servers = {};
	this.sockets = {};

	//Configures the HTTP server
	this.servers.http = require('http').createServer(this.app);

	this.servers.http.on('close', function() {
		Logger.warn('HTTP server closed');
	});

	//Configures the HTTPS server
	if(this.config.https.enabled) {    
		this.servers.https = require('https').createServer(this.config.httpsOptions, this.app);

		this.servers.https.on('close', function() {
			Logger.warn('HTTPS server closed');
		});
	}

	this.models = {};

	//Saves the client models path, to clean this folder when close the server
	this.clientModelsPath = '/app/public/models/gen';

	return this;

};

Rhapsody.prototype = {
	Model: require('./rhapsody/model'),

	/**
	 * Returns the serverModel or the whole model
	 * @param  {String} modelName The name of the model
	 * @param  {Boolean} full     Optional. Makes return the whole model
	 * @return {Model}
	 */
	requireModel: function requireModel(modelName, full) {
		if(!modelName) {
			return false;
		}

		modelName = modelName.toLowerCase();

		var model = this.models[modelName];

		if(full) {
			return (model ? model : false);
		}
		return (model ? model.serverModel : false);
	},

	/**
	 * Returns a class inside the /app/classes folder
	 * @param  {String} className The name (or path) of the class to be required
	 * @return {*}
	 */
	requireClass: function requireClass(className) {
		if(!className) {
			return false;
		}

		var theClass;

		try {
			theClass = require(path.join(this.root, '/app/classes/' + className));
		}
		catch(err) {
			requireClass = false;
			this.log.error(err);
		}

		return theClass;
	},

	/**
	 * Configure the server before open it
	 */
	configure: function configure(finishedBootstrap) {
		var self = this,
			sessionIDKey = this.config.session.sessionIDKey || 'sessionID';

		//If database is enabled, configure it
		if(this.config.database.enabled) {

			//Saves all the adapters
			this.config.adapters = require(path.join(this.root, '/app/config/db-adapters'));

			//Create the models and put it on this.models
			this.Model.generateModels(this, this.config.options.build);
		}

		//Set the layouts folder
		this.app.set('views', path.join(this.root, '/app/layouts'));

		//Configure express
		this.app.disable('x-powered-by'); //Disables the 'X-Powered-By: Express' on the HTTP header

		//Configures the global Express middlewares

		//Actives response compression
		if(this.config.compression.enabled) {
			this.app.use(this.middlewares.compression());
		}

		//Parses the request body to JSON and
		//actives URL encoded support
		this.app.use(this.middlewares.bodyParser()); 

		//Actives HTTP method overriding
		if(this.config.methodOverride.enabled) {
			this.app.use(this.middlewares.methodOverride(this.config.methodOverride.attributeName));
		}

		if(this.config.upload.enabled) {
			this.app.use(this.middlewares.multiparty()); //Actives File upload
		}

		//Actives the session/cookie support
		if(this.config.session.enabled) {
			var usingSignedCookie,
				maxAge = this.config.session.maxAge;

			if(this.config.session.cookiesSecret) {
				usingSignedCookie = true;
				this.cookieParser = this.middlewares.cookieParser(this.config.session.cookiesSecret); 
			}
			else {
				usingSignedCookie = false;
				this.cookieParser = this.middlewares.cookieParser();
			}

			//Actives cookies support
			this.app.use(this.cookieParser);

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

			this.config.session.sessionStore = this.config.session.sessionStore || new this.middlewares.session.MemoryStore();

			//Actives session support
			this.app.use(this.middlewares.session({
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
			this.app.use(this.middlewares.csurf());
			this.app.use(function (req, res, next) {
				res.locals._csrf = req.csrfToken();
				next();
			});
		}

		//Actives CORS
		if(this.config.cors.enabled) {
			var corsConfig = this.libs.lodash.omit(this.config.cors, 'enabled');
			this.app.use(this.middlewares.cors(corsConfig));
		}

		//Register the template engines and,
		//if enabled, configure i18n
		var Consolid8ion = require('consolid8ion'),
			templateEngines = this.config.templateEngines.engines,
			engineRequires = this.libs.lodash.mapValues(templateEngines, function(engine) {
				return engine.lib;
			}),
			i18nOptions = false;

		//Gets the settings for i18n and sets the path for the locales
		if(this.config.i18n.enabled) {
			i18nOptions = this.config.i18n;
			i18nOptions.path = path.join(this.root, '/app/locales');
		}

		var cons = new Consolid8ion(this.app, engineRequires, i18nOptions);

		//Set the default view engine
		this.app.set('view engine', this.config.templateEngines.defaultEngine);

		//Setup all the engines using Consolid8ion
		for(var engine in templateEngines) {
			cons.setup(engine, templateEngines[engine].extension);
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

		process.on('SIGTERM', function () {
			self.close();
		});
	},

	showLogo: function showLogo() {
		var logoLogger = new Wolverine({
			time: false,
			printLevel: false
		});

		var logo = [
			[' ', ' ', '_', '_', '_', ' ', '_', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '_', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '_', ' ', '_', '_', '_'],
			[' ', '|', ' ', '_', ' ', '\\', ' ', '|', '_', ' ', ' ', '_', '_', ' ', '_', ' ', '_', ' ', '_', '_', ' ', '_', '_', '_', ' ', '_', '_', '_', ' ', ' ', '_', '_', '|', ' ', '|', '_', ' ', ' ', '_', ' ', '_', ' ', '|', ' ', '/', ' ', '_', '_', '|'],
			[' ', '|', ' ', ' ', ' ', '/', ' ', '\'', ' ', '\\', '/', ' ', '_', '`', ' ', '|', ' ', '\'', '_', ' ', '(', '_', '-', '<', '/', ' ', '_', ' ', '\\', '/', ' ', '_', '`', ' ', '|', ' ', '|', '|', ' ', '|', ' ', '|', '|', ' ', '\\', '_', '_', ' ', '\\'],
			[' ', '|', '_', '|', '_', '\\', '_', '|', '|', '_', '\\', '_', '_', ',', '_', '|', ' ', '.', '_', '_', '/', '_', '_', '/', '\\', '_', '_', '_', '/', '\\', '_', '_', ',', '_', '|', '\\', '_', ',', ' ', '|', '\\', '_', '_', '/', '|', '_', '_', '_', '/'],
			[' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '|', '_', '|', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '|', '_', '_', '/']
		];

		for(var row in logo) {
			logoLogger.debug(logo[row].join(''));
		}

		logoLogger.info();
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

				//Saves the reference of the socket listening HTTPS
				self.sockets.http = ioHTTP;

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

					//Saves the reference of the socket listening HTTPS
					self.sockets.https = ioHTTPS;

					//Use the config/socket.js file
					self.callbacks.socket(ioHTTPS, sessionIoHTTPS);
				}

				var httpsPort = self.config.https.port;

				//Open the HTTPS server
				self.servers.https.listen(httpsPort);
				Logger.info('Listening HTTPS on port ' + httpsPort);
			}

		};

		//Shows the RhapsodyJS logo before other logging messages
		self.showLogo();

		//Configure the server before run it
		this.configure(runServer);
	},

	close: function close() {
		Logger.warn('Closing...');

		for(var server in this.servers) {
			this.servers[server].close();
		}

		//Remove the model's folder
		fs.removeSync(path.join(this.root, this.clientModelsPath));

	}
};


module.exports = Rhapsody;
