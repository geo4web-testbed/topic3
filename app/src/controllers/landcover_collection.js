
var createError = require('http-errors'),
  sendResponse = require('../sendResponse');

module.exports = function(esClient) {
  return function(req, res) {
    var currentPage = Number(req.query.page) || 1;

    var params = {
      index: 'geo4web',
      type: 'bestemmingsplangebied',
      sort: '_self_name'
    };

    if (req.accepts(['text/html', 'application/json', 'application/ld+json']).indexOf('json') >= 0) {
      params.size = 20;
    } else {
      params.size = 1000;
      params._source = ['_self_name'];
    }

    params.from = (currentPage - 1) * params.size;

    if (req.query.q) {
      params.q = req.query.q;
    }

    esClient.search(params).then(function(result) {
      sendResponse(req, res, 'landcover_collection', {
        items: result.hits.hits,
        currentPage: currentPage,
        numPages: 25
      });
    }).catch(err => {
      console.error(err);
    });
  };
};
