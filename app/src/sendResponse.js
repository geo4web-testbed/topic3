var jade = require('jade'),
  geojson2schema = require('geojson2schema')
  toKML = require('tokml'),
  jsonld = require('jsonld'),
  logger = require('./middleware/logger'),
  simplify = require('./simplify');

module.exports = function(req, res, template, data, status) {
  if (data._source && data._source._uri_strategy) {
    res.locals.uriStrategy = data._source._uri_strategy;
  }

  if (status !== undefined) {
    res.status(status);
  }

  res.format({
    'text/html': function() {
      try {
        res.send(
          jade.renderFile('./templates/' + template + '.jade', {
            data: data,
            geojson2schema: geojson2schema
          })
        );
      } catch(err) {
        console.error(err);
      }
    },
    'application/vnd.geo+json': function() {
      res.send(data._source);
    },
    'application/json': function() {
      res.send(toJson(data));
    },
    'application/ld+json': function() {
      res.send(toJsonLD(data));
    },
    'application/vnd.google-earth.kml+xml': function() {
      res.send(toKML(data._source));
    },
    'application/nquads': function() {
      jsonld.toRDF(toJsonLD(data._source), { format: 'application/nquads' }, function(err, quads) {
        res.send(quads);
      });
    },
    'application/n-triples': function() {
      jsonld.toRDF(toJsonLD(data._source), { format: 'application/nquads' }, function(err, quads) {
        res.send(quads);
      });
    },
    default: function() {
      res.status(406).end();
    }
  });

  logger.log(req, res);
};

function toJson(data) {
  if (data.items) {
    return data.items.map(function(feature) {
      feature._source = simplify(feature._source, 0.0001, 5);
      return toJson(feature);
    });
  }

  var json = data._source.properties;
  json.geo = data._source.geometry;

  return json;
}

function toJsonLD(data) {
  if (data.items) {
    return data.items.map(function(feature) {
      feature._source = simplify(feature._source, 0.0001, 5);
      return toJsonLD(feature);
    });
  }

  var jsonLd = toJson(data);
  jsonLd['@context'] = {
    'geo': 'http://schema.org/GeoShape',
    'polygon': 'http://schema.org/polygon'
  }
  jsonLd['@type'] = 'http://schema.org/Place';
  jsonLd.geo = geojson2schema({geoJson: jsonLd.geo});
  return jsonLd;
}
