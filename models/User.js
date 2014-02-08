var User = {
	name: {
		type: String,
	},
	age: {
		type: Number
	}
};

module.exports = rhapsody.newModel('User', User);