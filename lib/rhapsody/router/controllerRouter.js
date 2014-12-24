'use strict';

var fs = require('fs'),
		path = require('path'),
		Controller = require('../mvc/controller');

function ControllerRouter(rhapsodyApp) {
	this.app = rhapsodyApp.app;
	this.rhapsody = rhapsodyApp;
}

ControllerRouter.prototype = {

	route: function route() {

		var firstLevelControllers = fs.readdirSync(path.join(this.rhapsody.root, '/app/controllers')),
			_this = this;

		this.controllers = {};

		//Route the root controller
		var rootControllerName = this.rhapsody.config.routes.mainController,
			rootController = this.controllers['/'] = new Controller(rootControllerName, this.rhapsody.root + '/app/controllers/' + rootControllerName, this.rhapsody);
		this.app.use('/', rootController.router);

		//Route all the other firstLevelControllers
		firstLevelControllers.forEach(function(controller) {
			var newController = _this.controllers[controller] = new Controller(controller, _this.rhapsody.root + '/app/controllers/' + controller, _this.rhapsody);
			_this.app.use('/' + controller, newController.router);
		});

	}
};

module.exports = ControllerRouter;