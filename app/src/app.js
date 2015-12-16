'use strict';

var app = require('express')(),
  controller = require('./controller'),
  logger = require('./middleware/logger');

// Removes Express response header
app.disable('x-powered-by');

// Gets IP from X-Forwarded-For header
app.set('trust proxy', true);

// Log to Logstash
app.use(logger);

// Catch-all controller
app.use(controller);

var server = app.listen(3000, function() {
  console.log('Geo4web app listening at port %d...', server.address().port);
});
