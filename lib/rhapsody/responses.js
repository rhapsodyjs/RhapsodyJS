'use strict';

var http = require('http');

module.exports = {
	/**
	 * Respond to a request sending the correct status code, message and data
	 * @param  {ExpressResponse} res
	 * @param  {Number} code
	 * @param  {String} data
	 */
	respond: function respond(res, code, data) {
		// res.writeHead(code);
		res.end(data || http.STATUS_CODES[code]);
	},

  json: function json(res, code, data) {
    res.json(code, data);
  }
}