var Rhapsody = require('../../lib/rhapsody');

var rhapsody = new Rhapsody({
  root: __dirname,
  build: true
});

module.exports = rhapsody;

// rhapsody.open();