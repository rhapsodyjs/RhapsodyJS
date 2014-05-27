var Class = {
  attributes: {
    name: String
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
    students: {
      type: 'hasAndBelongsToMany',
      with: 'User'
    }
  }
};

module.exports = Class;