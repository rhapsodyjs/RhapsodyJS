var User = {
	attributes: {
		name: String,
		age: {
			type: Number,
			serverValidations: ['notNegative']
		},
    password: {
      type: String,
      restricted: true,
      required: true
    }
	},

	sharedMethods: {
		fullInfo: function() {
			return this.get('name') + ' - ' + this.get('age');
		},
		notNegative: function(value) {
			return value >= 0;
		}
	},

	clientMethods: {

	},

	serverMethods: {
		customMethod: function() {
      return 'Optional content';
    }
	},

	options: {
		allowREST: true,
		middlewares: ['logged']
	}
};

module.exports = User;