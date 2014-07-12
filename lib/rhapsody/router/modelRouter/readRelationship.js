var responseUtils = require('../../responseUtils'),
	_ = require('lodash'),
	filterAttributes = require('./filterAttributes');

module.exports = function readRelationship(req, res) {
    var fullModel = req.fullModel,
        ServerModel = fullModel.serverModel;;

    ServerModel.find(req.params.id, function(err, data) {
      if(err) {
        Rhapsody.log.error(err);
        responseUtils.respond(res, 500); //Internal server error
      }
      else {
        //Model does not has this relationship
        if(data[req.params.relationship]) {
          data[req.params.relationship](function readRelationshipData(err, relationshipData) {
            Rhapsody.log.verbose('Data reading', 'Data was read from relationship %s of collection %s', req.params.relationship, req.params.model);

            //Get the data of related model, to extract restricted attributes
            var relatedModelName = fullModel.relationships[req.params.relationship]['with'],
                relatedModel = Rhapsody.requireModel(relatedModelName, true),
                requiredAttributes = (req.query.attrs ? req.query.attrs.split(',') : undefined);

            var filteredData = filterAttributes(relationshipData, relatedModel, requiredAttributes);

            if(req.query.callback) {
              res.jsonp(200, filteredData); //No error, operation successful
            }
            else {
              res.json(200, filteredData); //No error, operation successful
            }
          });
        }
        else {
          responseUtils.respond(res, 400); //Malformed syntax or a bad query
        }
      }
    });
};