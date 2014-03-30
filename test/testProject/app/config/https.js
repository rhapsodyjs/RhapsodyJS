var fs = require('fs');

module.exports = {
  key: fs.readFileSync(__dirname + '../../../ssl/server.key'),
  cert: fs.readFileSync(__dirname + '../../../ssl/server.crt')
};