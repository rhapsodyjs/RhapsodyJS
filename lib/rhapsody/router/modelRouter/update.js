var responseUtils = require('../../responseUtils'),
	_ = require('lodash'),
	filterAttributes = require('./filterAttributes');

module.exports = function update(req, res) {
    var fullModel = req.fullModel,
        serverModel = fullModel.serverModel;

    //Remove the id and version field when updating
    var dataToUpdate = _.omit(req.body, ['id', '__v']);
    serverModel.find(req.params.id, function findDataToUpdate(err, data) {
      if(err) {
        Rhapsody.log.verbose(err);
        responseUtils.respond(res, 500); //Status code for service error on server
      }
      else {
        data.updateAttributes(dataToUpdate, function updateData(updatingErr) {
          if(updatingErr) {
            Rhapsody.log.verbose(err);
            responseUtils.respond(res, 400); //Malformed syntax or a bad query
          }
          else {
            var filteredData = filterAttributes(data, fullModel);

            if(req.method.toLowerCase() === 'put') {
              Rhapsody.log.verbose('Data update', 'Data was updated on collection %s', req.params.model);
            }
            //Otherwise, it's patch
            else {
              Rhapsody.log.verbose('Data patch', 'Data was patched on collection %s', req.params.model);
            }

            responseUtils.respond(res, 202, filteredData); //The request was received
          }
        });
      }
    });
};