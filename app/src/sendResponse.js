var jade = require('jade'),
  geojson2schema = require('geojson2schema')
  toKML = require('tokml'),
  jsonld = require('jsonld');

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
      res.send(data);
    },
    'application/json': function() {
      res.send(toJson(data));
    },
    'application/ld+json': function() {
      res.send(toJsonLD(data));
    },
    'application/vnd.google-earth.kml+xml': function() {
      res.send(toKML(data));
    },
    'application/nquads': function() {
      jsonld.toRDF(toJsonLD(data), { format: 'application/nquads' }, function(err, quads) {
        res.send(quads);
      });
    },
    'application/n-triples': function() {
      jsonld.toRDF(toJsonLD(data), { format: 'application/nquads' }, function(err, quads) {
        res.send(quads);
      });
    },
    default: function() {
      res.status(406).end();
    }
  });
};

function toJson(data) {
  var json = data.properties;
  json.geo = data.geometry;
  return json;
}

function toJsonLD(data) {
  var jsonLd = toJson(data);
  jsonLd['@context'] = {
    'geo': 'http://schema.org/GeoShape',
    'polygon': 'http://schema.org/polygon'
  }
  jsonLd['@type'] = 'http://schema.org/Place';
  jsonLd.geo = geojson2schema({geoJson: jsonLd.geo});
  return jsonLd;
}
