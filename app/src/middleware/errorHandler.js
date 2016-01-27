var sendResponse = require('../sendResponse');

module.exports = function(err, req, res, next) {
  console.error(err.stack);

  if (err.status === 303) {
    return res.redirect(303, err.message);
  }

  if (err.status === 404) {
    return sendResponse(req, res, '404', {
      message: err.message
    }, err.status);
  }

  sendResponse(req, res, '500', {
    message: 'Internal Server Error'
  }, 500);
};
