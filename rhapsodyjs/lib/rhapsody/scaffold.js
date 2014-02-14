var fs = require('fs-extra'),
    path = require('path');

module.exports = function scaffold(appName, appPath) {
  appPath = path.join(appPath, appName);

  fs.mkdirSync(appPath);

  //Copy the scaffold of a project to the app folder
  fs.copySync(__dirname + '/../scaffold', appPath, function(err) {
    if(err) {
      return console.warn(err);
    }
  });

  //Generate package.json
  var packageFile = {
    'name': appName,
    'main': 'app',
    'dependencies': {
      'rhapsodyjs': '*'
    }
  };

  fs.writeJSON(path.join(appPath, '/package.json'), packageFile, function(err) {
    if(err) {
      //If it fails, delete the folder created to the app
      fs.remove(appPath, function(err) {

      });
      return console.error(err);
    }
  });
};