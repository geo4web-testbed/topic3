'use strict';

var express = require('express'),
  elasticsearch = require('elasticsearch'),
  errorHandler = require('./middleware/errorHandler');

var app = express();

var esClient = new elasticsearch.Client({
  host: 'http://ec2-52-49-0-78.eu-west-1.compute.amazonaws.com:9200',
  log: process.env.NODE_ENV === 'production' ? 'error' : 'debug'
});

// Removes Express response header
app.disable('x-powered-by');

// Gets IP from X-Forwarded-For header
app.set('trust proxy', true);

// Serve assets dir
app.use(express.static('assets', { index: false }));

// Catch-all controller
app.get('/', require('./controllers/index')(esClient));
app.get('/landcover', require('./controllers/landcover')(esClient));
app.get('/landcover/*/*', require('./controllers/landcover_resource')(esClient));
app.get('/landcover/*', require('./controllers/landcover_collection')(esClient));
app.get('/sitemap(.*)?.xml.gz', require('./controllers/sitemap')(esClient));
app.get('*', require('./controllers/resource')(esClient));

// Handle errors
app.use(errorHandler);

var server = app.listen(3000, function() {
  console.log('Geo4web app listening at port %d...', server.address().port);
});
