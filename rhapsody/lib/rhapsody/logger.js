var colors = require('colors');

var levels = {
	input: 'grey',
	info: 'green',
	warn: 'yellow',
	debug: 'blue',
	error: 'red'
};

colors.setTheme(levels);

var Logger = function Logger(message) {
	console.log(message.info);
};

Logger.input = function(message) {
	console.log(message.input)
};

Logger.info = function(message) {
	console.log(message.info)
};

Logger.warn = function(message) {
	console.log(message.warn)
};

Logger.debug = function(message) {
	console.log(message.debug)
};

Logger.error = function(message) {
	console.log(message.error)
};

module.exports = Logger;