var User = {
	name: {
		type: String,
	},
	age: {
		type: Number
	}
};

module.exports = Rhapsody.newModel('User', User);