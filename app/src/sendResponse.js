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
      res.send(toQuads(data));
    },
    'application/n-triples': function() {
      res.send(toTriples(data));
    },
    default: function() {
      res.status(406).end();
    }
  });
};

function toJson(data) {
  var json = data;
  json.requestType = 'APPLICATION/JSON'
  return json;
}

function toJsonLD(data) {
  var jsonLd = toJson(data);
  jsonLd.requestType = 'APPLICATION/LD+JSON';
  return jsonLd;
}

function toQuads(data) {
  var context = {};
  jsonld.toRDF(toJsonLD(data), { format: 'application/nquads', expandContext: context }, function(err, quads) {
    return quads;
  });
}

function toTriples(data) {
  return toQuads(data);//.replace(new RegExp('<https://geo4web.apiwise.nl> .', 'g'), '.');
}
