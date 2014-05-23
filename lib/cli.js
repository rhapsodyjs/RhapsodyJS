#!/usr/bin/env node

'use strict';

var parser = require('nomnom'),
    appPath = process.cwd(),
    appName = '',
    scaffoldPath = __dirname + '/scaffold',
    pjson = require(__dirname + '/../package.json'),
    Wolverine = require('wolverine'),
    Logger = new Wolverine(),
    scaffolder = require('./rhapsody/scaffolder'),
    path = require('path');

parser.script('rhapsody');

var msg = {
  /**
   * Says that an argument is required
   * @param  {String} arg
   */
  argument: function argument(arg) {
    Logger.info();
    return Logger.warn(arg + ' argument is required');
  },

  /**
   * Show the usage of a command
   * @param  {String} example
   */
  usage: function usage(example) {
    Logger.info();
    return Logger.info('Usage: rhapsody ' + example);
  },

  /**
   * Show the possible options of a command
   * @param  {String} command
   * @param  {Array} options Array of arrays, where each sub-array has his usage in the first position, and explanation in the second
   */
  showOptions: function showOptions(command, options) {
    var opt,
        option;

    Logger.info();
    Logger.info(command);
    for(opt in options) {
      option = options[opt];
      Logger.info('   ' + option[0] + '\t' + option[1]);
    }
    return;
  },

  /**
   * Says that a command is invalid
   * @param  {String} command        [description]
   */
  invalid: function invalid(command) {
    return Logger.warn(command + ' is invalid');
  }
};

var serverOperations = {
  build: function build() {
    //Imports the local RhapsodyJS of the app
    var Rhapsody = require(path.join(appPath, '/node_modules/rhapsody')),
    rhapsodyServer = new Rhapsody({
          root: appPath,
          build: true
        });

    return rhapsodyServer;
  },
  run: function run(rhapsodyServer) {
    //Imports the local RhapsodyJS of the app
    var Rhapsody = require(path.join(appPath, '/node_modules/rhapsody'));
    rhapsodyServer = rhapsodyServer || new Rhapsody({
      root: appPath,
      build: false
    });

    rhapsodyServer.open();
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
    //If wasn't passed the attributes and/or the name
    if(extras.length <= 3) {
      msg.argument('attribute');
      msg.usage('model <name> <attribute:type> [|attribute:type]');
      msg.showOptions('type', [['String', ''], ['Number', ''], ['Date', ''], ['Buffer', ''], ['Boolean', ''], ['Mixed', ''], ['Objectid', ''], ['Array', '']]);
      return;
    }
    else {
      scaffolder.scaffoldModel(extras[2], extras.slice(3, extras.length));
    }
  }

  if(extras[1] === 'controller') {
    //If wasn't passed the views and/or the name
    if(extras.length <= 3) {
      msg.argument('view');
      msg.usage('controller <name> <view> [|view]');
      msg.showOptions('name', [['name\t\t', 'Just the name'], ['supcontrollers>name', 'All the supercontrollers of the controller']]);
      msg.showOptions('view', [['viewName\t', 'Just the name'], ['verb:viewName', 'The HTTP verb, followed by the name']]);
      return;
    }
    else {
      scaffolder.scaffoldController(extras[2], extras.slice(3, extras.length));
    }
  }

}).help('Create a new controller or model');


/**
 * Builds the project without run the server
 */
parser.command('build').callback(function(opts) {
  var extras = opts._;
  if(extras.length > 1) {
    return msg.usage('build');
  }
  serverOperations.build();
  return;
}).help('Build the server without run it');


/**
 * Run the server, optionally not building it before
 */
parser.command('run')
.option('no-build', {
  abbr: 'n',
  full: 'no-build',
  flag: true,
  help: 'Don\'t build again, just run'
}).callback(function(opts) {
  
  var extras = opts._;
  if(extras.length > 2) {
    msg.usage('run [no-build]');
    msg.showOptions('no-build', [['-n --no-build', 'Don\'t build again, just run']]);
    return;
  }

  //If the no-build flas was passed, just run the server without build it
  if(opts['no-build']) {
    serverOperations.run();
  }
  else {
    //Build the server, than pass it to be run
    serverOperations.run(serverOperations.build());
  }

}).help('Build the server then run it. If -n or --no-build is passed, run the server without build it');

parser.parse();