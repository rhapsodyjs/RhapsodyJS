var fs = require('fs-extra'),
    path = require('path'),
    appPath = process.cwd(),
    Logger = require('./logger');

module.exports = {

  scaffoldApp: function scaffoldApp(appName, appPath, appVersion) {
    appPath = path.join(appPath, appName);

    Logger('Scaffolding app');
  
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

    //Copy RhapsodyJS itself to node_modules
    fs.mkdirSync(path.join(appPath, '/node_modules'));
    fs.copySync(path.join(__dirname, '/../../'), path.join(appPath, '/node_modules/rhapsody'), function(err) {
      if(err) {
        return Logger.error(err);
      }
    });


    logger.log('Generating package.json');
    //Generate package.json
    var packageFile = {
      'name': appName,
      'main': 'app',
      'dependencies': {
        'rhapsody': ('~' + appVersion)
      }
    };

    fs.writeJSON(path.join(appPath, '/package.json'), packageFile, function(err) {
      if(err) {
        //If it fails, delete the folder created to the app
        fs.remove(appPath, function(err) {

        });
        return Logger.error(err);
      }
    });
  },

  scaffoldModel: function scaffoldModel(modelName, modelAttributes) {

  },

  scaffoldController: function scaffoldController(controllerName) {

  }

};


