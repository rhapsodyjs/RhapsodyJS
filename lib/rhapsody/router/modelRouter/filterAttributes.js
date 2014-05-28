var _ = require('lodash');

/**
 * Given a model and its data, remove what attribute the user wants, except the restrict attributes
 * @param  {Object} data      Object of attributes
 * @param  {RhapsodyModel} fullModel 
 * @param {Array} wantedAttributes The attributes the user wants, defaults to all
 * @return {Object}           The data object, omiting the restrict attributes of the model
 */
module.exports = function filterAttributes(data, fullModel, wantedAttributes) {
  wantedAttributes = wantedAttributes || Object.keys(fullModel.attributes);

  //Send the model id anyway
  if(!_.contains(wantedAttributes), 'id') {
    wantedAttributes.push('id');
  }

  var restrictedAttributes = Object.keys(fullModel.restrictedAttributes),
      filteredData;

  if(_.isArray(data)) {
    filteredData =  _.map(data, function(rawData) {
      rawData = _.omit(rawData, restrictedAttributes);
      return _.pick(rawData, wantedAttributes);
    });
  }
  else {
    filteredData = _.omit(data, restrictedAttributes);
    filteredData = _.pick(filteredData, wantedAttributes);
  }

  return filteredData;
};