'use strict';

var fs = require('fs-extra'),
    _ = require('lodash'),
    path = require('path'),
    express = require('express'),
    Response = require('../router/response');

var Controller = function Controller(name, controllerPath, rhapsodyApp) {
	this.app = rhapsodyApp;
	this.path = controllerPath;

	var info = require(controllerPath);

	this.router = express.Router();
	this.name = name;

	this.views = info.views;
	this.mainView = info.mainView || rhapsodyApp.config.routes.mainView;
	this.middlewares = info.middlewares;

	this.route();
};

Controller.prototype = {

	route: function route() {

		if(_.isArray(this.middlewares)) {

			for(var i = 0; i < this.middlewares.length; i++) {

				var middleware;

				if(typeof this.middlewares[i] === 'function') {
					middleware = this.middlewares[i];
				}
				else {
					middleware = require(path.join(this.app.root, '/app/middlewares/' + this.middlewares[i]));
				}

				this.router.use(middleware);
			}

		}

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

			var files = fs.readdirSync(path.join(this.path, '/controllers')),
				self = this;
			
			files.forEach(function(file) {
				var newController = self.subcontrollers[file] = new Controller(file, self.path + '/controllers/' + file, self.app);

				self.router.use('/' + file, newController.router);
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
			action = this.extractAction(info.action);
		}
		else {
			action = this.extractAction(info);
		}

		this.router[verb](viewPath, action);

	},

	getNameAndVerb: function getNameAndVerb(viewName) {
		var name,
			verb;

		name = viewName.split(':');

		if(name.length == 2) {
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

	extractAction: function extractAction(view) {
		var self = this;

		if(typeof view === 'function') {
		  var viewArity = view.length;

		  //If it's a common action
		  if(viewArity === 2) {
		    return function(req, res) {
		      view(req, new Response(res, self.path));
		    }
		  }
		  //If it's a middleware
		  if(viewArity === 3) {
		    return function(req, res, next) {
		      view(req, new Response(res, self.path), next);
		    }
		  }
		  //If it's an error handler
		  if(viewArity === 4) {
		    return function(err, req, res, next) {
		      view(err, req, new Response(res, self.path), next);
		    }
		  }
		  
		}
		//If it's just the path to a static file, send it
		else if(typeof view === 'string') {
		  var realPath = this.path + '/views/' + view;
		  return function(req, res) {
		    res.sendfile(realPath);
		  };
		}
	}

};

module.exports = Controller;