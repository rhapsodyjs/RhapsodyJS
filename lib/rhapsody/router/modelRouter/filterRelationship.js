'use strict';

var DataCollection = require('data-collection'),
	_ = require('lodash');

/**
 * Given a array of relationship data and the HTTP query, filters it
 * @param  {Array} data      Array of data coming from a relationship
 * @param  {Object} httpQuery
 * @return {Array}
 */
module.exports = function filterRelationship(data, httpQuery) {
	if(!_.isArray(data)) {
		return data;
	}

	if(httpQuery.limit || httpQuery.offset || httpQuery.orderby || httpQuery.order) {
		var collection = new DataCollection(data),
			query = collection.query();

		if(httpQuery.orderby) {
			httpQuery.order = httpQuery.order || 'asc';
			query = query.order(httpQuery.orderby, httpQuery.order === 'desc');
		}

		if(httpQuery.limit || httpQuery.offset) {
			httpQuery.offset = httpQuery.offset || 0;
			query = query.limit(httpQuery.offset, httpQuery.limit);
		}

		return query.values();
	}

	return data;
};