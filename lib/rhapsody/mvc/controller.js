'use strict';

var fs = require('fs-extra'),
	_ = require('lodash'),
	path = require('path'),
	express = require('express'),
	Response = require('../router/response'),
	utils = require('../utils');

function Controller(name, controllerPath, rhapsodyApp) {
	this.app = rhapsodyApp;
	this.path = controllerPath;

	var info = require(controllerPath);

	this.router = express.Router();
	this.name = name;

	this.views = info.views || {};
	this.mainView = info.mainView || rhapsodyApp.config.routes.mainView;
	this.middlewares = info.middlewares || [];

	this.route();
}

Controller.prototype = {

	route: function route() {
		var _this = this;

		this.middlewares.forEach(function(middleware) {
			if(typeof middleware !== 'function') {
				middleware = require(path.join(_this.app.root, '/app/middlewares/' + middleware));
			}

			_this.router.use(middleware);
		});

		//Route main view
		this.bindView(this.mainView, this.views[this.mainView], true);

		//Route other views
		for(var v in this.views) {
			if(this.views.hasOwnProperty(v)) {
				this.bindView(v, this.views[v]);
			}
		}

		//Route subcontrollers
		try {

			this.subcontrollers = {};

			var files = fs.readdirSync(path.join(this.path, '/controllers'));

			files.forEach(function(file) {
				var newController = _this.subcontrollers[file] = new Controller(file, _this.path + '/controllers/' + file, _this.app);

				_this.router.use('/' + file, newController.router);
			});

		}
		catch(e) {
			this.subcontrollers = false;
		}

	},

	bindView: function bindView(viewName, info, isRoot) {
		var nameAndVerb = this.getNameAndVerb(viewName),
			middleware,
			viewPath,
			action,
			verb,
			name;

		if(isRoot) {
			viewPath = '/';
			verb = nameAndVerb.verb;
		}
		else {
			name = nameAndVerb.name;
			verb = nameAndVerb.verb;
			viewPath = '/' + name;
		}

		if(info.params) {
			viewPath += '/' + info.params.join('/');
		}

		if(_.isArray(info.middlewares)) {

			for(var i = 0; i < info.middlewares.length; i++) {

				if(typeof info.middlewares[i] === 'function') {
					middleware = info.middlewares[i];
				}
				else {
					middleware = require(path.join(this.app.root, '/app/middlewares/' + info.middlewares[i]));
				}

				this.router[verb](viewPath, middleware);
			}
		}

		if(info.action) {
			action = this.extractAction(info.action, viewName);
		}
		else {
			action = this.extractAction(info, viewName);
		}

		this.router[verb](viewPath, action);

	},

	getNameAndVerb: function getNameAndVerb(viewName) {
		var name,
			verb;

		name = viewName.split(':');

		if(name.length === 2) {
			verb = name[0].toLowerCase();
			name = name[1];
		}
		else {
			verb = 'get';
			name = name[0];
		}

		return {
			name: name,
			verb: verb
		};
	},

	extractAction: function extractAction(view, name) {
		var _this = this;

		if(typeof view === 'function') {
			var viewArity = view.length,
				viewAction;

			switch(viewArity) {
				//If it's a common action
				case 2:
					viewAction = function(req, res) {
						view(req, new Response(res, _this.path));
					};
					break;

				//If it's a middleware
				case 3:
					viewAction = function(req, res, next) {
						view(req, new Response(res, _this.path), next);
					};
					break;

				//If it's an error handler
				case 4:
					viewAction = function(err, req, res, next) {
						view(err, req, new Response(res, _this.path), next);
					};
					break;
				default:
					utils.Logger.error('Invalid action', '"' + name + '" at "' + this.name + '" controller has wrong number of parameters.');
					return null;
			}

			return viewAction;
		}
		//If it's just the path to a static file, send it
		else if(typeof view === 'string') {
			var realPath = path.join(this.path, '/views/' + view);

			return function(req, res) {
				res.sendFile(realPath);
			};
		}
	}
};

module.exports = Controller;