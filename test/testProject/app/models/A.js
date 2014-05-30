var ModelA = {
  attributes: {
    attr: Number
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
    users: {
      type: 'hasAndBelongsToMany',
      with: 'B',
      through: 'AB'
    }
  }
};

module.exports = ModelA;