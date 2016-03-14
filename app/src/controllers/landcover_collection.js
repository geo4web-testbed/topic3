
var createError = require('http-errors'),
  sendResponse = require('../sendResponse');

module.exports = function(esClient) {
  var params = {
    index: 'geo4web',
    type: 'bestemmingsplangebied',
    size: 1000,
    sort: '_self_name',
    _source: ['_self_name']
  };

  return function(req, res) {
    const currentPage = Number(req.query.page) || 1;
    params.from = (currentPage - 1) * 1000;

    esClient.search(params).then(function(result) {
      sendResponse(req, res, 'landcover_collection', {
        areas: result.hits.hits,
        currentPage: currentPage,
        numPages: 25
      });
    }).catch(err => {
      console.error(err);
    });
  };
};
