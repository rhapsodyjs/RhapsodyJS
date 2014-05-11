var Group = {
  attributes: {
    name: String,
    registry: {
      type: Number,
      serverValidations: ['notNegative']
    }
  },

  sharedMethods: {

  },

  clientMethods: {

  },

  serverMethods: {
    notNegative: function(value) {
      return value >= 0;
    }
  },

  options: {
    allowREST: true
  }
};

module.exports = Group;