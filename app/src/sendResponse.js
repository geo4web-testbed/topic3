var jade = require('jade'),
  geojson2schema = require('geojson2schema');

module.exports = function(req, res, data, status) {
  if (status !== undefined) {
    res.status(status);
  }

  res.format({
    'text/html': function() {
      try {
        res.send(
          jade.renderFile('./templates/base.jade', {
            object: data,
            jsonld: JSON.stringify({
              '@context': 'http://schema.org',
              '@type': 'Place',
              geo: geojson2schema({
                geoJson: data.geometry
              })
            })
          })
        );
      } catch(err) {
        console.error(err);
      }
    },
    'application/json': function() {
      res.json(data);
    },
    default: function() {
      res.status(406).end();
    }
  });
};
