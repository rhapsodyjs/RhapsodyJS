var fs = require('fs-extra'),
    path = require('path'),
    appPath = process.cwd(),
    Wolverine = require('wolverine'),
    Logger = new Wolverine({time: false, printLevel: false}),
    npm = require('npm'),
    _ = require('lodash');

module.exports = {

  scaffoldApp: function scaffoldApp(appName, appPath, appVersion) {
    appPath = path.join(appPath, appName);

    Logger.info('Scaffolding app');
    try {
      fs.mkdirSync(appPath);
    }
    catch(e) {
      Logger.error(e.message);
    }

    //Copy the scaffold of a project to the app folder
    fs.copySync(path.join(__dirname, '/../scaffold'), appPath, function(err) {
      if(err) {
        return Logger.error(err);
      }
    });

    //Generate package.json
    var packageFile = {
      'name': appName,
      'main': 'app',
      'dependencies': {
        'rhapsody': ('>=' + appVersion),
        'ejs': '^0.8.5'
      }
    };

    fs.writeJSON(path.join(appPath, '/package.json'), packageFile, function(err) {
      if(err) {
        fs.remove(appPath, function(err) {});
        return Logger.error(err);
      }

      Logger.info('Running "npm install"')
      //Run 'npm install' inside the new app folder
      npm.load({prefix: appPath, loglevel: 'error'}, function (err) {
        npm.commands.install([], function (er, data) {
        });
        npm.on('log', function (message) {
        });
      });

    });
  },

  scaffoldModel: function scaffoldModel(modelName, attributes) {
    var model = {
      attributes: {
      },

      sharedMethods: {
      },

      clientMethods: {

      },

      serverMethods: {
        
      },

      options: {
        allowREST: true,
        middlewares: []
      }
    };

    var attr, i, attribute;

    //Fills the model attributes with it's types
    for(i = 0; i < attributes.length; i++) {
      attr = attributes[i];
      attribute = attr.split(':');
      if(attribute.length === 2) {
        model.attributes[attribute[0]] = {
          type: attribute[1]
        }
      }
      else {
        return Logger.warn('You forgot an attribute type');
      }
    }

    var modelTemplate = _.template('var <%= name %> = <%= modelData %>;\n\nmodule.exports = <%= name %>;');

    var modelString = modelTemplate({
      name: modelName,
      modelData: JSON.stringify(model, null, '\t')
    });

    try {
      fs.writeFile(path.join(appPath, '/app/models/' + modelName + '.js'), modelString, function(err) {
        if(err) {
          return Logger.warn(err);
        }
      });
    }
    catch(e) {
      throw e;
    }
  },

  scaffoldController: function scaffoldController(controllerName, views) {

  }

};


