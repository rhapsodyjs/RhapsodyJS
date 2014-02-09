var express = require('express');

var app = express();

global.rhapsody = require('./api/rhapsody')(__dirname);

rhapsody.database.connect(rhapsody.config.db.host, rhapsody.config.db.name);

var router = require('./api/config/router');

app.configure(function() {
  app.use('/public', express.static(__dirname + '/public'));
});

router.route(app);

app.listen(rhapsody.defaults.server.port);
console.log('Listening port ' + rhapsody.defaults.server.port);