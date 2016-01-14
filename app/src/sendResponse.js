var jade = require('jade'),
  geojson2schema = require('geojson2schema');

module.exports = function(req, res, template, data, status) {
  if (status !== undefined) {
    res.status(status);
  }

  res.format({
    'text/html': function() {
      try {
        res.send(
          jade.renderFile('./templates/' + template + '.jade', {
            object: data,
            geojson2schema: geojson2schema
          })
        );
      } catch(err) {
        console.error(err);
      }
    },
    'application/vnd.geo+json': function() {
      res.json(data);
    },
    'application/json': function() {
      res.json(data);
    },
    'application/ld+json': function() {
      res.json(data);
    },
    'application/vnd.google-earth.kml+xml': function() {
      res.send(tokml(data));
    },
    default: function() {
      res.status(406).end();
    }
  });
};
