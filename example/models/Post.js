var Post = {
	attributes: {
    title: {
      type: String,
      default: 'Empty title'
    },
		text: String
	},

	sharedMethods: {

	},

	clientMethods: {

	},

	serverMethods: {
		
	},

	options: {
		allowREST: false,
		middlewares: []
	}
};

module.exports = Post;