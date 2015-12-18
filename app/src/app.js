'use strict';

var app = require('express')(),
  logger = require('./middleware/logger'),
  serveStatic = require('serve-static');

// Removes Express response header
app.disable('x-powered-by');

// Gets IP from X-Forwarded-For header
app.set('trust proxy', true);

// Serve assets dir
app.use(serveStatic('assets', { index: false }));

// Log to Logstash
app.use(logger);

// Catch-all controller
app.get('/', require('./controllers/index'));
app.get('*', require('./controllers/resource'));

var server = app.listen(3000, function() {
  console.log('Geo4web app listening at port %d...', server.address().port);
});
