#!/usr/bin/env node

var parser = require('nomnom'),
	appPath = process.cwd(),
	appName = '',
	scaffoldPath = __dirname + '/scaffold',
	pjson = require(__dirname + '/../package.json'),
	colors = require('colors'),
  Logger = require('./rhapsody/logger'),
  scaffolder = require('./rhapsody/scaffolder');

colors.setTheme(Logger.themes);

parser.script('rhapsody');


var msg = {
  argument: function argument(argument) {
    console.log('');
    return console.log((argument + ' argument is required').error);
  },
  usage: function usage(example) {
    console.log('');
    return console.log('Usage:'.bold + (' rhapsody ' + example));
  },
  showOptions: function showOptions(command, options) {
    console.log('');
    console.log(command);
    for(var opt in options) {
      var option = options[opt];
      console.log(('   ' + option[0] + '\t' + option[1]).grey);
    }
    return;
  },
  invalid: function invalid(command) {
    return console.log((command + ' is invalid').error);
  }
};


/**
 * Scaffolds a new project
 */
parser.command('new').callback(function(opts) {
	if(opts._.length === 1) {
    msg.argument('name');
		return msg.usage('new <name>');
	}

	appName = opts._[1];

	scaffolder.scaffoldApp(appName, appPath, pjson.version);

}).help('Create a new app');


/**
 * Scaffolds a new controller or model
 */
parser.command('generate').callback(function(opts) {
  var extras = opts._;

	if(extras.length === 1) {
		msg.argument('generator');
		msg.usage('generate <generator>');
    msg.showOptions('generator', [['controller', 'Create a new controller'], ['model', 'Create a new model']]);
		return;
	}

  if(extras[1] === 'model') {
    if(extras.length <= 3) {
      msg.argument('attribute');
      return msg.usage('model <name> <attribute:type> [|attribute:type]');
    }
    else {
      scaffolder.scaffoldModel(extras[2], extras.slice(3, extras.length));
    }
  }

  if(extras[1] === 'controller') {
    if(extras.length <= 3) {
      msg.argument('view');
      return msg.usage('controller <name> <view> [|view]');
    }
    else {
      scaffolder.scaffoldController(extras[2], extras.slice(3, extras.length));
    }
  }

}).help('Create a new controller or model');

parser.parse();