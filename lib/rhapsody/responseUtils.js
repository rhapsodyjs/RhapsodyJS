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
		return res.status(code).send(data || http.STATUS_CODES[code]);
	},

	json: function json(req, res, code, data) {
		if(req.query.callback) {
		  return res.status(code).jsonp(data);
		}

		return res.status(code).json(data);

	}
};