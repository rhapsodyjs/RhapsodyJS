var http = require('http'),
    path = require('path');

module.exports = {
  error404Handler: function(req, res) {
    var code = 404;
    if(req.xhr) {
      res.send(code, http.STATUS_CODES[code]);
    }
    else {
      res.status(code);
      res.render(path.join(__dirname, '/' + code));      
    }
  },

  error500Handler: function(err, req, res, next) {
    var code = 500;
    if(req.xhr) {
      res.send(code, http.STATUS_CODES[code]);
    }
    else {
      res.status(code);
      res.render(path.join(__dirname, '/' + code));      
    }
  }
};