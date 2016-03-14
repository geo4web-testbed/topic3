
var createError = require('http-errors'),
  sendResponse = require('../sendResponse');

module.exports = function(esClient) {
  return function(req, res) {
    sendResponse(req, res, 'landcover', {});
  };
};
