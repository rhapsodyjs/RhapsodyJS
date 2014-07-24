var Rhapsody = require('rhapsody');

var rhapsody = new Rhapsody({
  root: __dirname
});

module.exports = rhapsody;

rhapsody.open();