module.exports = {
	mongodb: {
		lib: require('jugglingdb-mongodb'),
		host: 'localhost',
		port: 27017,
		database: 'rhapsodyTests',
		username: undefined,
		password: undefined
	},
	memory: {
		lib: 'memory'
	}
};