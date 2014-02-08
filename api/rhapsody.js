module.exports = function(root) {
  return {
    database: require('mongoose'),
    config: {
      db: require(root + '/api/config/database')
    },
    rootPath: root,

    defaults: require(root + '/api/config/defaults'),

    newModel: function newModel(modelName, schemaObject) {
      var schema = rhapsody.database.Schema(schemaObject);
      return rhapsody.database.model(modelName, schema);
    },

    requireModel: function requireModel(modelName) {
      return require(root + '/models/' + modelName);
    }
  };
}