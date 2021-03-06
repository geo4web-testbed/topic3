
var createError = require('http-errors'),
  sendResponse = require('../sendResponse');

module.exports = function(esClient) {
  var params = {
    index: 'geo4web',
    type: 'gemeente',
    sort: '_self_name'
  };

  return function(req, res) {
    var currentPage = Number(req.query.page) || 1;

    params.size = 1000;
    params._source = ['_self_name'];

    if (req.accepts(['text/html', 'application/json', 'application/ld+json']).indexOf('json') >= 0) {
      params.size = 20;
      delete params._source;
    }

    params.from = (currentPage - 1) * params.size;

    esClient.search(params).then(function(result) {
      sendResponse(req, res, 'index', {
        items: result.hits.hits
      });
    }).catch(err => {
      console.error(err);
    });
  };
};
