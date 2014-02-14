#!/usr/bin/env node

var parser = require('nomnom'),
    appPath = process.cwd(),
    appName = '',
    scaffoldPath = __dirname + '/scaffold',
    pjson = require(__dirname + '/../package.json');

global.Rhapsody = global.Rhapsody || {};
Rhapsody.version = pjson.version;

parser.script('rhapsody')

parser.command('new').callback(function(opts) {
  if(opts._.length === 1) {
    return console.warn('You forgot the app name');
  }

  var scaffolder = require('./rhapsody/scaffolder');

  appName = opts._[1];

  scaffolder.scaffoldApp(appName, appPath, Rhapsody.version);

}).help('Create a new RhapsodyJS app');

parser.parse();