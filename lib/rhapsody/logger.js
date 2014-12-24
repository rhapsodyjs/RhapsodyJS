'use strict';

var Wolverine = require('wolverine');

module.exports = function(config) {
	return new Wolverine(Wolverine[config.level.toUpperCase()], config);
};