'use strict';

var path = require('path'),
	Wolverine = require('wolverine'),
	fs = require('fs-extra'),
	cluster = require('cluster'),
	packageJSON = require('../package.json'),
	utils = require('./rhapsody/utils'),
	Logger = utils.Logger;

/**
 * RhapsodyJS app class
 * @param {Object} options Options
 * @constructor
 */
function Rhapsody(options) {
	//Expose object as global
	//Should fix it latter
	global.Rhapsody = this;

	this.options = options;
	this.root = options.root;

	//Libs used internally that the programmer can access
	this.libs = {
		express: require('express'),
		jsmin: require('jsmin').jsmin,
		lodash: require('lodash'),
		wolverine: require('wolverine')
	};

	this.config = require(path.join(this.root, '/app/config/config'));

	//Get the general environment settings
	this.config = this.libs.lodash.merge(this.config, require(path.join(this.root, '/app/config/envs/all')));

	//Overwrite it with the defined environment settings
	this.config = this.libs.lodash.merge(this.config, require(path.join(this.root, '/app/config/envs/' + this.config.environment)));

	//Then extends it with the other settings
	var loadConfig = require('./rhapsody/app/config');
	this.config = this.libs.lodash.merge(this.config, loadConfig(options));

	return this;

}

/**
 * Add info about RhapsodyJS
 */
Rhapsody.info = {
	version: packageJSON.version
};

Rhapsody.prototype = {
	Model: require('./rhapsody/mvc/model'),

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
			theClass = undefined;
			this.log.error(err);
		}

		return theClass;
	},

	/**
	 * Configure the server before open it
	 */
	configure: function configure(options, finishedBootstrap) {
		var ControllerRouter = require('./rhapsody/router/controllerRouter'),
			ModelRouter = require('./rhapsody/router/modelRouter'),
			_this = this;

		this.app = this.libs.express();

		this.router = {
			controllerRouter: new ControllerRouter(this),
			modelRouter: new ModelRouter(this)
		};

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

		//If database is enabled, configure it
		if(this.config.database.enabled) {

			//Saves all the adapters
			this.config.adapters = require(path.join(this.root, '/app/config/db-adapters'));

			//Create the models and put it on this.models
			this.Model.generateModels(this);
		}

		//Set the layouts folder
		this.app.set('views', path.join(this.root, '/app/layouts'));

		//Configure express
		this.app.disable('x-powered-by'); //Disables the 'X-Powered-By: Express' on the HTTP header

		//Configures the global Express middlewares
		this.setupMiddlewares();

		//Configure the controller routes
		this.router.controllerRouter.route();

		//Configure the RESTful API routes
		if(this.config.routes.allowREST) {
			this.router.modelRouter.route();
		}

		//Serve the /app/public file as the public folder
		this.app.use(this.libs.express.static(this.root + '/app/public'));

		//Logs the error
		this.app.use(function errorLogger(err, req, res, next) {
			_this.log.error(err);
			next(err);
		});

		//Configure the handlers defined by the user
		this.app.use(this.config.error.error404Handler);
		this.app.use(this.config.error.error500Handler);

		this.callbacks.bootstrap(this, finishedBootstrap);

		this.config.globals = this.config.globals || {};

		//Set the models as globals if enabled
		if(this.config.globals.models) {
			for(var m in this.models) {
				if(this.models.hasOwnProperty(m)) {
					global[m] = this.models[m].serverModel;
				}
			}
		}

	},

	/**
	 * Setup the Express middlewares
	 */
	setupMiddlewares: function setupMiddlewares() {
		//Middlewares used internally that the programmer can access
		this.middlewares = require('./rhapsody/middlewares');

		var sessionIDKey = this.config.session.sessionIDKey || 'sessionID';

		//Actives response compression
		if(this.config.compression.enabled) {
			this.app.use(this.middlewares.compression());
		}

		//Parses the request body to JSON and
		//actives URL encoded support
		this.app.use(this.middlewares.bodyParser.urlencoded({
			extended: true
		}));
		this.app.use(this.middlewares.bodyParser.json());

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

			this.config.session.sessionStore = this.config.session.sessionStore || new this.middlewares.session.MemoryStore();

			//Actives session support
			this.app.use(this.middlewares.session({
				secret: this.config.session.sessionSecret,
				name: sessionIDKey,
				cookie: {
					httpOnly: true,
					maxAge: maxAge
				},
				store: this.config.session.sessionStore,
				saveUninitialized: true,
				resave: true,
				rolling: true,
				unset: 'destroy'
			}));

			//Actives req.flash() support
			this.app.use(this.middlewares.flash());
		}

		//Actives CSRF protection
		if(this.config.csrf.enabled) {
			this.app.use(this.middlewares.csurf());
			this.app.use(function(req, res, next) {
				res.locals._csrf = req.csrfToken();
				next();
			});
		}

		//Actives CORS
		if(this.config.cors.enabled) {
			var corsConfig = this.libs.lodash.omit(this.config.cors, 'enabled');
			this.app.use(this.middlewares.cors(corsConfig));
		}

		//Active morgan to network log
		var stream = require('stream'),
			morganStream = new stream.Writable(),
			_this = this;

		morganStream._write = function _write(chunk, encoding, done) {
			_this.log.debug(chunk.toString());
			done();
		};

		this.app.use(this.middlewares.morgan('combined', {
			stream: morganStream
		}));

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

		//Sets i18n as Rhapsody.i18n.i18n()
		if(this.config.i18n.enabled) {
			this.i18n = cons.i18n;
		}

		//Set the default view engine
		this.app.set('view engine', this.config.templateEngines.defaultEngine);

		//Setup all the engines using Consolid8ion
		for(var engine in templateEngines) {
			cons.setup(engine, templateEngines[engine].extension);
		}
	},

	showLogo: function showLogo() {
		var logoLogger = new Wolverine({
			printTime: false,
			printLevel: false
		}),
		logo = [
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

	generateClientModels: function generateClientModels() {
		var clientModelsPath,
			clientModelAdapterOptions,
			ClientModelAdapter;

		if(this.config.clientModels) {
			clientModelsPath = path.join(this.root, this.config.clientModels.destination || 'app/public/models');
			clientModelAdapterOptions = this.libs.lodash.omit(this.config.clientModels, ['enabled', 'adapter']);
			ClientModelAdapter = this.config.clientModels.adapter || require('rhapsodyjs-backbone');
		}
		else {
			clientModelsPath = path.join(this.root, 'app/public/models');
			clientModelAdapterOptions = {};
			ClientModelAdapter = require('rhapsodyjs-backbone');
		}

		clientModelAdapterOptions.urlRoot = '/data/';

		var clientModelAdapter = new ClientModelAdapter(clientModelAdapterOptions),
			modelsPath = path.join(this.root, '/app/models');

		fs.readdirSync(modelsPath).forEach(function(file) {
			if(utils.jsFileRegex.test(file)) {

				var model = require(path.join(modelsPath, file)),
					modelName = file.substring(0, file.length - 3);

				if(typeof model.options.generateClientModel === 'undefined' || model.options.generateClientModel) {
					var clientModelFileContent = clientModelAdapter.generate(modelName, model);

					//Saves the client model to its file
					fs.outputFileSync(path.join(clientModelsPath, modelName + '.js'), clientModelFileContent);
				}
			}
		});

	},

	openMaster: function openMaster() {
		var _this = this;

		//If it uses the old "generateClientModels" option or do not have a clientModel adapter, use "rhapsodyjs-backbone"
		if(this.config.generateClientModels || (typeof this.config.clientModels !== 'undefined' && this.config.clientModels.enabled)) {
			try {
				this.generateClientModels();
			}
			catch(e) {
				Logger.error(e);
			}
		}

		//Show the message that it's all online
		var onlineMessage = function onlineMessage() {
			_this.showLogo();

			var httpPort = _this.config.http.port;
			Logger.info('Listening HTTP on port ' + httpPort);

			if(_this.config.https.enabled) {
				var httpsPort = _this.config.https.port;
				Logger.info('Listening HTTPS on port ' + httpsPort);
			}
		};

		//If it's using cluster, create a fork for
		//each one of the CPUs
		if(this.usingCluster) {
			var numCPUs = require('os').cpus().length,
				onlineWorkers = 0;

			// Fork workers.
			for (var i = 0; i < numCPUs; i++) {
				cluster.fork();
			}

			//Show the info only after all workers are online
			cluster.on('online', function(worker) {
				Logger.info('Worker ' + worker.process.pid + ' started.');

				onlineWorkers++;

				if(onlineWorkers === numCPUs) {
					onlineMessage();
				}

			});

			//Restarting worker if it dies
			cluster.on('exit', function(worker, code, signal) { // jshint ignore:line
				Logger.warn('Worker ' + worker.process.pid + ' died with code [' + code + '], restarting it...');

				_this.close(worker.process.pid);

				cluster.fork();
			});
		}
		else {
			onlineMessage();
		}
	},

	openWorker: function openWorker() {
		var _this = this,
			runServer = function runServer() {
				var SessionSockets = require('session.socket.io');

				//If socket is enabled for HTTP
				if(_this.config.http.socket) {
					var ioHTTP = require('socket.io').listen(_this.servers.http, {
							// logger: _this.log,
							'log level': 0
						}),
						sessionIoHTTP;

					//If session must be used with the session
					if(_this.config.session.enabled) {
						sessionIoHTTP = new SessionSockets(ioHTTP, _this.config.session.sessionStore, _this.cookieParser, _this.config.session.sessionIDKey || 'sessionID');
					}
					else {
						sessionIoHTTP = undefined;
					}

					//Saves the reference of the socket listening HTTPS
					_this.sockets.http = ioHTTP;

					//Use the config/socket.js file
					_this.callbacks.socket(ioHTTP, sessionIoHTTP);
				}

				var httpPort = _this.config.http.port;

				//Open the HTTP server
				_this.servers.http.listen(httpPort);

				if(_this.config.https.enabled) {

					//If socket is enabled for HTTPS
					if(_this.config.https.socket) {
						var ioHTTPS = require('socket.io').listen(_this.servers.https, {
								// logger: _this.log,
								'log level': 0
							}),
							sessionIoHTTPS;

						//If session must be used with the session
						if(_this.config.session.enabled) {
							sessionIoHTTPS = new SessionSockets(ioHTTPS,
																_this.config.session.sessionStore,
																_this.cookieParser,
																_this.config.session.sessionIDKey || 'sessionID');
						}
						else {
							sessionIoHTTPS = undefined;
						}

						//Saves the reference of the socket listening HTTPS
						_this.sockets.https = ioHTTPS;

						//Use the config/socket.js file
						_this.callbacks.socket(ioHTTPS, sessionIoHTTPS);
					}

					var httpsPort = _this.config.https.port;

					//Open the HTTPS server
					_this.servers.https.listen(httpsPort);
				}
			};

		//Configure the server before run it
		this.configure(this.options, runServer);
	},

	open: function open() {

		this.usingCluster = (typeof this.config.cluster === 'undefined' || this.config.cluster.enabled);

		if(this.usingCluster) {
			if (cluster.isMaster) {
				this.openMaster();
			}
			else {
				this.openWorker();
			}
		}
		else {
			this.openMaster();
			this.openWorker();
		}
	},

	close: function close(workerID) {
		if(this.usingCluster) {
			Logger.warn('Closing servers of worker ' + workerID + '.');
		}
		else {
			Logger.warn('Closing servers');
		}

		for(var server in this.servers) {
			this.servers[server].close();
		}

	}
};

module.exports = Rhapsody;
