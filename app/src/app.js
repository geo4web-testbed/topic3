'use strict';

var app = require('express')(),
  logger = require('./middleware/logger.js');

// Gets IP from X-Forwarded-For header
app.set('trust proxy', true);

// Log to Logstash
app.use(logger());

app.get('/', function(req, res) {
  res.send('Geo4web!');
});

var server = app.listen(3000, function() {
  console.log('Geo4web app listening at port %d...', server.address().port);
});
