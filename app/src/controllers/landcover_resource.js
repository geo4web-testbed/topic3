const createError = require('http-errors'),
  sendResponse = require('../sendResponse'),
  simplify = require('../simplify');

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

    params = {
      index: ES_INDEX,
      type: '_all',
      id: BASE_URI + path
    };

    return esClient.get(params)
      .then(function(data) {
        data._source = simplify(data._source, 0.0001, 5);
        res.locals.uriStrategy = data._source._uri_strategy;
        sendResponse(req, res, 'landcover_resource', data);
      }).catch(function(err) {
        next(err);
      });
  };
};
