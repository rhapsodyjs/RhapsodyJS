var fs = require('fs');

module.exports = {
  key: fs.readFileSync(Rhapsody.root + '/ssl/server.key'),
  cert: fs.readFileSync(Rhapsody.root + '/ssl/server.crt')
};