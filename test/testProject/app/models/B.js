var ModelB = {
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
      with: 'A',
      through: 'AB'
    }
  }
};

module.exports = ModelB;