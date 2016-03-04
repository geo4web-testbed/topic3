const createError = require('http-errors'),
  sendResponse = require('../sendResponse');

const ES_INDEX = 'geo4web';
const BASE_URI = 'https://geo4web.apiwise.nl';

module.exports = function(esClient) {
  return function(req, res, next) {
    var params, matches,
      path = decodeURIComponent(req.path);

    // Rewrite KML paths
    if (matches = path.match(/^(.+)\.kml$/)) {
      path = matches[1];
      req.headers.accept = 'application/vnd.google-earth.kml+xml';
    }

    // Handle DBpedia redirects
    if (matches = path.match(/^\/resource\/(.*)$/)) {
      throw createError(303, '/page/' + matches[1]);
    }

    // Handle PLDN redirects
    if (matches = path.match(/^\/id\/(.*)$/)) {
      throw createError(303, '/doc/' + matches[1]);
    }

    params = {
      index: ES_INDEX,
      type: '_all',
      id: BASE_URI + path
    };

    return esClient.get(params)
      .then(enrich)
      .then(function(data) {
        res.locals.uriStrategy = data._source._uri_strategy;
        sendResponse(req, res, 'resource', data);
      }).catch(function(err) {
        next(err);
      });
  };

  function enrich(data) {
    if (data._type === 'gemeente') {
      return esClient.search({
        index: ES_INDEX,
        type: 'wijk',
        size: 1000,
        fields: [],
        body: {
          sort: '_self_name',
          query: {
            filtered: {
              filter: {
                term: {
                  '_parent_id': data._source._self_id
                }
              }
            }
          }
        }
      }).then(function(result) {
        data.quarters = result.hits.hits;
        return data;
      });
    }

    if (data._type === 'wijk') {
      return esClient.search({
        index: ES_INDEX,
        type: 'gemeente',
        size: 1,
        fields: [],
        body: {
          query: {
            filtered: {
              filter: {
                term: {
                  '_self_id': data._source._parent_id
                }
              }
            }
          }
        }
      }).then(function(result) {
        data.municipality = result.hits.hits[0];

        return esClient.search({
          index: ES_INDEX,
          type: 'buurt',
          size: 1000,
          fields: [],
          body: {
            sort: '_self_name',
            query: {
              filtered: {
                filter: {
                  term: {
                    '_parent_id': data._source._self_id
                  }
                }
              }
            }
          }
        }).then(function(result) {
          data.neighbourhoods = result.hits.hits;
        });
      }).then(function(result) {
        return data;
      });
    }

    if (data._type === 'buurt') {
      return esClient.search({
        index: ES_INDEX,
        type: 'wijk',
        size: 1,
        fields: [],
        body: {
          query: {
            filtered: {
              filter: {
                term: {
                  '_self_id': data._source._parent_id
                }
              }
            }
          }
        }
      }).then(function(result) {
        data.quarter = result.hits.hits[0];

        return esClient.search({
          index: ES_INDEX,
          type: 'gemeente',
          size: 1,
          fields: [],
          body: {
            query: {
              filtered: {
                filter: {
                  term: {
                    '_self_id': data._source.properties.GM_CODE
                  }
                }
              }
            }
          }
        }).then(function(result) {
          data.municipality = result.hits.hits[0];
        });
      }).then(function(result) {
        return data;
      });
    }

    return data;
  };
};
