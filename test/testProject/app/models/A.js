var ModelA = {
  attributes: {
    attr: String
  },

  sharedMethods: {

  },

  clientMethods: {

  },

  serverMethods: {
  },

  options: {
    allowREST: true
  },

  relationships: {
    bs: {
      type: 'hasAndBelongsToMany',
      with: 'B',
      through: 'AB'
    }
  }
};

module.exports = ModelA;