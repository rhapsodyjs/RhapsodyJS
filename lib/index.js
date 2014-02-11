module.exports = function rhapsody(root) {

  var express = require('express'),
      app = express();

  global.Rhapsody = require('./rhapsody/rhapsody')(root);

  Rhapsody.database.connect(Rhapsody.config.db.host, Rhapsody.config.db.name);

  var router = require('./rhapsody/router');

  app.configure(function() {
    app.use('/public', express.static(Rhapsody.root + '/public'));
  });

  router.routeControllers(app);

  return {
    listen: function(port) {
      app.listen(port);
      console.log('Listening port ' + port);
    }
  }

};
