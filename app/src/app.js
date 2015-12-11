'use strict';

var app = require('express')();

app.get('/', function(req, res) {
  res.send('Geo4web!');
});

var server = app.listen(3000, function() {
  console.log('Geo4web app listening at port %d...', server.address().port);
});
