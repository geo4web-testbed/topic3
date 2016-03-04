'use strict';

const async = require('async'),
  elasticsearch = require('elasticsearch'),
  gdal = require('gdal');

const esClient = new elasticsearch.Client({
  host: 'elasticsearch:9200',
  log: 'error'
});

const BASE_URI = 'https://geo4web.apiwise.nl';
// const BASE_URI = 'http://192.168.99.100:3000';
const ES_INDEX = 'geo4web';
const SRC_PATH = process.argv[2];
const ES_TYPE = process.argv[3];
const ATTR_ID = process.argv[4];
const ATTR_NAME = process.argv[5];
const ATTR_PARENT_ID = process.argv[6];

const dataset = gdal.open(SRC_PATH);
const layer = dataset.layers.get(0);
const uriStrategies = ['dbpedia', 'hierarchical', 'rest', 'pldn', 'unstructured'];

const transformation = new gdal.CoordinateTransformation(
  gdal.SpatialReference.fromProj4('+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.999908 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs no_defs <>'),
  gdal.SpatialReference.fromProj4('+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs')
);

Promise.resolve()
// .then(deleteIndex)
// .then(createIndex)
.then(createMapping)
.then(function() {
  let result,
    feature,
    actions = [];

  async.whilst(
    function () {
      feature = layer.features.next();
      return (null !== feature);
    },
    function (callback) {
      // Exceptions for CBS wijken_buurten_2015
      if (ES_TYPE === 'gemeente' || ES_TYPE === 'wijk' || ES_TYPE === 'buurt') {
        if (feature.fields.get('WATER') === 'JA' || feature.fields.get('GM_CODE') === 'GM9999') {
          return callback();
        }
      }

      result = Promise.resolve(feature.fields.toObject());

      // Exceptions for CBS wijken_buurten_2015
      if (ES_TYPE === 'buurt') {
        result = result.then((properties) => {
          return getWkNaam(properties.WK_CODE)
            .then((wkNaam) => {
              properties.WK_NAAM = wkNaam;
              return Promise.resolve(properties);
            });
        });
      }

      result
        .then((properties) => {
          let uriStrategy;

          if (ES_TYPE === 'gemeente' || ES_TYPE === 'wijk' || ES_TYPE === 'buurt') {
            let numId = parseInt(properties['GM_CODE'].replace(/\D/g, ''));
            uriStrategy = uriStrategies[numId % uriStrategies.length];
          } else {
            uriStrategy = 'pldn';
          }

          let geometry = transform(feature);

          feature.setGeometry(transform(feature));

          actions.push({
            index: {
              _id: generateUri(properties, uriStrategy)
            }
          });

          actions.push({
            _self_id: properties[ATTR_ID],
            _self_name: properties[ATTR_NAME],
            _parent_id: ATTR_PARENT_ID ? properties[ATTR_PARENT_ID] : null,
            _uri_strategy: uriStrategy,
            type: 'Feature',
            geometry: geometry.toObject(),
            properties: properties
          });

          if (actions.length === 50) {
            console.log('Bulk inserting... (mem usage: %s)', process.memoryUsage().heapUsed);
            return bulkInsert(actions)
              .then(() => {
                actions = [];
              });
          }
        })
        .then(() => {
          callback();
        })
        .catch((err) => {
          console.error(err);
        });
    },
    function (err) {
      if (err) return console.error(err);

      if (actions.length > 0) {
        bulkInsert(actions, function(err) {
          if (err) return console.error(err);
          console.log('Ready!');
        });
      } else {
        console.log('Ready!');
      }
    }
  );
})
.catch(function(err) {
  console.error(err);
});

function deleteIndex() {
  return esClient.indices.delete({ index: ES_INDEX })
    .catch(function(err) {});
}

function createIndex() {
  return esClient.indices.create({ index: ES_INDEX });
}

function createMapping() {
  return esClient.indices.putMapping({
    index: ES_INDEX,
    type: ES_TYPE,
    body: {
      properties: {
        _self_id: {
          type: 'string',
          index: 'not_analyzed'
        },
        _self_name: {
          type: 'string',
          index: 'not_analyzed'
        },
        _parent_id: {
          type: 'string',
          index: 'not_analyzed'
        },
        _uri_strategy: {
          type: 'string',
          index: 'not_analyzed'
        }
      }
    }
  });
}

function transform(feature) {
  let geometry = feature.getGeometry();

  geometry.transform(transformation);

  return geometry;
};

function bulkInsert(actions) {
  return esClient.bulk({
    index: ES_INDEX,
    type: ES_TYPE,
    body: actions
  });
};

function generateUri(properties, uriStrategy) {
  var uri = BASE_URI;

  switch (uriStrategy) {
    case 'dbpedia':
      uri = uri + '/page/' + escapeValue(properties[ATTR_NAME]);
      if (ES_TYPE !== 'gemeente') uri = uri + ',_' + escapeValue(properties['GM_NAAM']);
      uri = uri + '_(' + ES_TYPE + ')';
      break;
    case 'hierarchical':
      if (ES_TYPE !== 'gemeente') uri = uri + '/' + escapeValue(properties['GM_NAAM']);
      if (ES_TYPE === 'buurt') uri = uri + '/' + escapeValue(properties['WK_NAAM']);
      uri = uri + '/' + escapeValue(properties[ATTR_NAME]);
      break;
    case 'rest':
      uri = uri + '/' + ES_TYPE + '/' + properties[ATTR_ID];
      break;
    case 'pldn':
      uri = uri + '/doc/' + ES_TYPE + '/' + properties[ATTR_ID];
      break;
    case 'unstructured':
      uri = uri + '/unstructured/' + new Buffer(JSON.stringify({
        id: properties[ATTR_ID],
        type: ES_TYPE
      })).toString('base64');
      break;
    default:
      throw new Error('URI strategy not supported: ' + uriStrategy);
  }

  return uri;
}

function escapeValue(value) {
  return value.replace(/\s/g, '_');
}

function getWkNaam(wkCode) {
  let params = {
    index: ES_INDEX,
    type: 'wijk',
    size: 1,
    _source: ['_self_name'],
    body: {
      query: {
        filtered: {
          filter: {
            term: {
              '_self_id': wkCode
            }
          }
        }
      }
    }
  };

  return esClient.search(params)
    .then((result) => {
      if (result.hits.total === 0) {
        console.log('WK_CODE "%s" not found', wkCode);
        return '';
      }

      return result.hits.hits[0]._source._self_name;
    });
}
