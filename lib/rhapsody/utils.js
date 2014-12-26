var _ = require('lodash');

module.exports = {
	defaultsDeep: _.partialRight(_.merge, function deep(value, other) {
	  return _.merge(value, other, deep);
	}),
	jsFileRegex: /^\w+\.js$/i
};