'use strict';

var _ = require('lodash'),
	path = require('path');

function Response(res, viewRoot) {

	var newRes = _.defaults(res, {
		/**
		 * Simulates render using the view folder of the current controller
		 * @param  {Object} options Name parameters to use in res.render()
		 *
		 * Options can have the given properties:
		 *   - name: the name of the file inside controller/views fold
		 *   - locals: possible locals
		 */
		view: function view(options) {
			var name = options.name,
				locals = options.locals,
				callback = options.callback;

			this.render(path.join(this._viewRoot, '/views/' + name), locals, callback);
		},

		_viewRoot: viewRoot
	});

	return newRes;
}

module.exports = Response;