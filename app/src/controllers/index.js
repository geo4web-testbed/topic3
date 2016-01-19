
var createError = require('http-errors'),
  sendResponse = require('../sendResponse');

module.exports = function(esClient) {
  var params = {
    index: 'wijken_buurten_2015',
    type: 'gemeente',
    size: 1000,
    body: {
      _source: 'doc.properties.GM_NAAM',
      sort: [
        { 'doc.properties.GM_NAAM': 'asc' }
      ]
    }
  };

  return function(req, res) {
    esClient.search(params).then(function(result) {
      sendResponse(req, res, 'index', {
        municipalities: result.hits.hits
      });
    });
  };
};
