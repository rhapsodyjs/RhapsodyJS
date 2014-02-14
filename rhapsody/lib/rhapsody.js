#!/usr/bin/env node

var parser = require('nomnom'),
	appPath = process.cwd(),
	appName = '',
	scaffoldPath = __dirname + '/scaffold',
	pjson = require(__dirname + '/../package.json'),
	Logger = require('./rhapsody/logger');

parser.script('rhapsody')

//Scaffolds a new project
parser.command('new').callback(function(opts) {
	if(opts._.length === 1) {
		return Logger.input('Usage: rhapsody new <app name>');
	}

	var scaffolder = require('./rhapsody/scaffolder');

	appName = opts._[1];

	scaffolder.scaffoldApp(appName, appPath, pjson.version);

}).help('Create a new RhapsodyJS app');


//Scaffolds a new controller or model
parser.command('generate').callback(function(opts) {
	if(opts._.length === 1) {
		Logger('');
		Logger.input('Usage'.white + ': rhapsody generate <generator>');
		Logger('');
		Logger.input('generator\tone of: <model>, <controller>');
		Logger('');
		Logger.input('\tmodel\t\t<name> <attribute> [attributes]');
		Logger('');
		Logger.input('\tcontroller\t<name> <view> [views]');
		return;
	}
});

parser.parse();