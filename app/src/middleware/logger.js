var winston = require('winston');

require('winston-logstash');

var transports = [];

if (process.env.NODE_ENV === 'production') {
  transports.push(
    new (winston.transports.Logstash)({
      host: '127.0.0.1',
      port: 28777
    })
  );
} else {
  transports.push(
    new (winston.transports.Console)({
      json: true
    })
  );
}

var logger = new (winston.Logger)({
  transports: transports
});

module.exports = function() {
  return function(req, res, next) {
    next();

    logger.info(req.method + ' ' + req.originalUrl, {
      request: {
        url: req.originalUrl,
        method: req.method,
        query: req.query,
        ip: req.ip,
        accept: req.get('Accept'),
        agent: req.get('User-Agent')
      }
    });
  };
};
