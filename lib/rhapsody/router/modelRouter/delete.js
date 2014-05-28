var responseUtils = require('../../responseUtils'),
	_ = require('lodash'),
	filterAttributes = require('./filterAttributes');

module.exports = function del(req, res) {
    var fullModel = req.fullModel,
        serverModel = fullModel.serverModel;

    serverModel.find(req.params.id, function deleteData(errFinding, data) {
      if(errFinding) {
        Rhapsody.log.verbose(errFinding);
        responseUtils.respond(res, 500); //Status code for service error on server
      }
      else {
        data.destroy(function(errDestroying) {
          if(errDestroying) {
            Rhapsody.log.verbose(errDestroying);
            responseUtils.respond(res, 500); //Status code for service error on server
          }
          else {
            Rhapsody.log.verbose('Data deletion', 'Data was deleted from collection %s', req.params.model);
            responseUtils.respond(res, 202); //The request was received
          }
        });
      }
    });
};