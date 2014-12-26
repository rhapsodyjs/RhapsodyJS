'use strict';

var _ = require('lodash'),
	Wolverine = require('wolverine');

module.exports = {
	defaultsDeep: _.partialRight(_.merge, function deep(value, other) {
		return _.merge(value, other, deep);
	}),
	jsFileRegex: /^\w+\.js$/i,
	Logger: new Wolverine(Wolverine.DEBUG, { printTime: false })
};