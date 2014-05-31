var ModelB = {
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
    as: {
      type: 'hasAndBelongsToMany',
      with: 'A',
      through: 'AB'
    }
  }
};

module.exports = ModelB;