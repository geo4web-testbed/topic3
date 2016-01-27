var createError = require('http-errors'),
  sendResponse = require('../sendResponse');

module.exports = function(esClient) {
  return function(req, res, next) {
    var params, matches,
      path = req.path;

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
      index: 'wijken_buurten_2015',
      type: '_all',
      id: 'https://geo4web.apiwise.nl' + path
    };

    return esClient.get(params)
      .then(enrich)
      .then(function(data) {
        res.locals.uriStrategy = data._source.meta.uriStrategy;
        sendResponse(req, res, 'resource', data);
      }).catch(function(err) {
        next(err);
      });
  };

  function enrich(data) {
    if (data._type === 'gemeente') {
      return esClient.search({
        index: 'wijken_buurten_2015',
        type: 'wijk',
        size: 1000,
        fields: [],
        body: {
          sort: [
            { WK_NAAM: 'asc' }
          ],
          query: {
            filtered: {
              filter: {
                term: {
                  'doc.properties.GM_CODE': data._source.doc.properties.GM_CODE
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
        index: 'wijken_buurten_2015',
        type: 'gemeente',
        size: 1,
        fields: [],
        body: {
          query: {
            filtered: {
              filter: {
                term: {
                  'doc.properties.GM_CODE': data._source.doc.properties.GM_CODE
                }
              }
            }
          }
        }
      }).then(function(result) {
        data.municipality = result.hits.hits[0];

        return esClient.search({
          index: 'wijken_buurten_2015',
          type: 'buurt',
          size: 1000,
          fields: [],
          body: {
            sort: [
              { BU_NAAM: 'asc' }
            ],
            query: {
              filtered: {
                filter: {
                  term: {
                    'doc.properties.WK_CODE': data._source.doc.properties.WK_CODE
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
        index: 'wijken_buurten_2015',
        type: 'wijk',
        size: 1,
        fields: [],
        body: {
          query: {
            filtered: {
              filter: {
                term: {
                  'doc.properties.WK_CODE': data._source.doc.properties.WK_CODE
                }
              }
            }
          }
        }
      }).then(function(result) {
        data.quarter = result.hits.hits[0];

        return esClient.search({
          index: 'wijken_buurten_2015',
          type: 'gemeente',
          size: 1,
          fields: [],
          body: {
            query: {
              filtered: {
                filter: {
                  term: {
                    'doc.properties.GM_CODE': data._source.doc.properties.GM_CODE
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
