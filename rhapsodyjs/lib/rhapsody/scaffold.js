var fs = require('fs-extra'),
    path = require('path');

module.exports = function scaffold(appName, appPath) {
  // appPath = path.join(appPath, appName);

  // fs.mkdirSync(appPath);

  // //Copy the scaffold of a project to the app folder
  // fs.copySync(__dirname + '/../scaffold', appPath, function(err) {
  //   if(err) {
  //     throw err;
  //   }

  // });

  //Generate package.json
  var packageFile = {
    'name': appName,
    'main': 'app',
    'dependencies': {
      'rhapsodyjs': '*'
    }
  };

  // fs.writeJSONSync(path.join(appPath, '/package.json'), JSON.stringify(packageFile), function(err) {
  //   // console.error(err);
  //   // if(err) {
  //   //   throw err;
  //   // }
  // });
}