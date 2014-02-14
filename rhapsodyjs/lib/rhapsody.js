#!/usr/bin/env node

var parser = require('nomnom'),
    appPath = process.cwd(),
    appName = '',
    scaffoldPath = __dirname + '/scaffold';

parser.script('rhapsody')

parser.command('new').callback(function(opts) {
  if(opts._.length === 1) {
    return console.warn('You forgot the app name');
  }

  var scaffold = require('./rhapsody/scaffold');

  appName = opts._[1];

  scaffold(appName, appPath);

}).help('Create a new RhapsodyJS app');

parser.parse();