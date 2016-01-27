'use strict';

var express = require('express'),
  elasticsearch = require('elasticsearch'),
  errorHandler = require('./middleware/errorHandler'),
  logger = require('./middleware/logger');

var app = express();

var esClient = new elasticsearch.Client({
  host: 'https://search-geo4web-if2ippqsoax25uzkvf7qkazw7m.eu-west-1.es.amazonaws.com',
  log: process.env.NODE_ENV === 'production' ? 'error' : 'debug'
});

// Removes Express response header
app.disable('x-powered-by');

// Gets IP from X-Forwarded-For header
app.set('trust proxy', true);

// Serve assets dir
app.use(express.static('assets', { index: false }));

// Log to Logstash
app.use(logger);

// Catch-all controller
app.get('/', require('./controllers/index')(esClient));
app.get('/sitemap(.*)?.xml.gz', require('./controllers/sitemap')(esClient));
app.get('*', require('./controllers/resource')(esClient));

// Handle errors
app.use(errorHandler);

var server = app.listen(3000, function() {
  console.log('Geo4web app listening at port %d...', server.address().port);
});
