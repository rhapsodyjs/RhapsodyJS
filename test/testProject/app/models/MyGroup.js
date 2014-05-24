var MyGroup = {
  attributes: {
    name: String,
    registry: {
      type: Number,
      serverValidations: ['notNegative']
    },
    acronym: String,
    restrictedAttr: {
      type: String,
      restricted: true
    },
    requiredAttribute: {
      type: String,
      required: true
    }
  },

  sharedMethods: {

  },

  clientMethods: {

  },

  serverMethods: {
    notNegative: function(err) {
      if(this.registry < 0) {
        err();
      }
    }
  },

  options: {
    allowREST: true,
    adapter: 'memory'
  }
};

module.exports = MyGroup;