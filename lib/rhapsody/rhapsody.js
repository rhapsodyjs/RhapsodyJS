module.exports = function globalRhapsody(root) {

  return {
    config: {
      db: require(root + '/config/database')
    },

    database: require('mongoose'),
    defaults: require(root + '/config/defaults'),

    newModel: function newModel(modelName, schemaObject) {
      var schema = Rhapsody.database.Schema(schemaObject);
      return Rhapsody.database.model(modelName, schema);
    },

    requireModel: function requireModel(modelName) {
      return require(root + '/models/' + modelName);
    },

    root: root
  };
};