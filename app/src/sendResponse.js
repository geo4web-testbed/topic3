var jade = require('jade'),
  geojson2schema = require('geojson2schema')
  toKML = require('tokml'),
  jsonld = require('jsonld'),
  logger = require('./middleware/logger');

module.exports = function(req, res, template, data, status) {
  if (data._source && data._source.meta && data._source.meta.uriStrategy) {
    res.locals.uriStrategy = data._source.meta.uriStrategy;
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
      res.send(data._source.doc);
    },
    'application/json': function() {
      res.send(toJson(data._source.doc));
    },
    'application/ld+json': function() {
      res.send(toJsonLD(data._source.doc));
    },
    'application/vnd.google-earth.kml+xml': function() {
      res.send(toKML(data._source.doc));
    },
    'application/nquads': function() {
      jsonld.toRDF(toJsonLD(data._source.doc), { format: 'application/nquads' }, function(err, quads) {
        res.send(quads);
      });
    },
    'application/n-triples': function() {
      jsonld.toRDF(toJsonLD(data._source.doc), { format: 'application/nquads' }, function(err, quads) {
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
