'use strict';

var fs = require('fs'),
		_ = require('lodash'),
		path = require('path'),
		Controller = require('../mvc/controller');

var ControllerRouter = function(rhapsodyApp) {
	this.app = rhapsodyApp.app;
	this.rhapsody = rhapsodyApp;
}

ControllerRouter.prototype = {

	route: function route() {

		var firstLevelControllers = fs.readdirSync(path.join(this.rhapsody.root, '/app/controllers')),
			self = this;

		this.controllers = {};

		//Route the root controller
		var rootControllerName = this.rhapsody.config.routes.mainController,
			rootController = this.controllers['/'] = new Controller(rootControllerName, this.rhapsody.root + '/app/controllers/' + rootControllerName, this.rhapsody);
		this.app.use('/', rootController.router);

		//Route all the other firstLevelControllers
		firstLevelControllers.forEach(function(controller) {
			var newController = self.controllers[controller] = new Controller(controller, self.rhapsody.root + '/app/controllers/' + controller, self.rhapsody);
			self.app.use('/' + controller, newController.router);
		});

	}
};

module.exports = ControllerRouter;