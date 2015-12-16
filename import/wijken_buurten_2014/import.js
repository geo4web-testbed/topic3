'use strict';

var Promise = require('bluebird'),
  elasticsearch = require('elasticsearch'),
  shapefile = require('shapefile'),
  proj4 = require('proj4');

// Taken from: http://spatialreference.org/ref/epsg/wgs-84/
proj4.defs('WGS84', '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs');

// Taken from: http://blog.openstreetmap.nl/index.php/2012/01/21/rd/
proj4.defs('RD', '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.999908 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs no_defs <>');

var reader,
  esClient = new elasticsearch.Client({
    host: 'https://search-geo4web-if2ippqsoax25uzkvf7qkazw7m.eu-west-1.es.amazonaws.com',
    // log: 'trace'
  });

Promise.resolve().then(function() {
  return esClient.indices.delete({ index: 'wijken_buurten_2014' });
}).then(function() {
  return esClient.indices.create({
    index: 'wijken_buurten_2014',
    body: {
      mappings: {
        gemeente: {
          properties: {
            type: {
              type: 'string',
              index: 'no'
            },
            geometry: {
              type: 'geo_shape'
            },
            properties: {
              type: 'object',
              properties: {
                GM_CODE: {
                  type: 'string',
                  index: 'not_analyzed'
                },
                GM_NAAM: {
                  type: 'string',
                  index: 'not_analyzed'
                },
                WATER: {
                  type: 'string',
                  index: 'not_analyzed'
                }
              }
            }
          }
        },
        wijk: {
          properties: {
            type: {
              type: 'string',
              index: 'no'
            },
            geometry: {
              type: 'geo_shape'
            },
            properties: {
              type: 'object',
              properties: {
                WK_CODE: {
                  type: 'string',
                  index: 'not_analyzed'
                },
                WK_NAAM: {
                  type: 'string',
                  index: 'not_analyzed'
                },
                GM_CODE: {
                  type: 'string',
                  index: 'not_analyzed'
                },
                GM_NAAM: {
                  type: 'string',
                  index: 'not_analyzed'
                },
                WATER: {
                  type: 'string',
                  index: 'not_analyzed'
                }
              }
            }
          }
        },
        buurt: {
          properties: {
            type: {
              type: 'string',
              index: 'no'
            },
            geometry: {
              type: 'geo_shape'
            },
            properties: {
              type: 'object',
              properties: {
                BU_CODE: {
                  type: 'string',
                  index: 'not_analyzed'
                },
                BU_NAAM: {
                  type: 'string',
                  index: 'not_analyzed'
                },
                WK_CODE: {
                  type: 'string',
                  index: 'not_analyzed'
                },
                GM_CODE: {
                  type: 'string',
                  index: 'not_analyzed'
                },
                GM_NAAM: {
                  type: 'string',
                  index: 'not_analyzed'
                },
                WATER: {
                  type: 'string',
                  index: 'not_analyzed'
                }
              }
            }
          }
        }
      }
    }
  });
}).then(function() {
  reader = Promise.promisifyAll(shapefile.reader('./shapefile/gem_2014'));
  return reader.readHeaderAsync();
}).then(function() {
  return importRecord('wijken_buurten_2014', 'gemeente', 'GM_CODE', 'GM_NAAM');
}).then(function() {
  reader = Promise.promisifyAll(shapefile.reader('./shapefile/wijk_2014'));
  return reader.readHeaderAsync();
}).then(function() {
  return importRecord('wijken_buurten_2014', 'wijk', 'WK_CODE', 'WK_NAAM');
}).then(function() {
  reader = Promise.promisifyAll(shapefile.reader('./shapefile/buurt_2014'));
  return reader.readHeaderAsync();
}).then(function() {
  return importRecord('wijken_buurten_2014', 'buurt', 'BU_CODE', 'BU_NAAM');
}).catch(function(err) {
  console.error(err);
});

function importRecord(index, type, idProperty, nameProperty) {
  return reader.readRecordAsync().then(function(record) {
    if (record === shapefile.end || record.properties[nameProperty] === null) {
      return;
    }

    switch (record.geometry.type) {
      case 'Polygon':
        record.geometry.coordinates = record.geometry.coordinates.map(function(c1) {
          return c1.map(function(c2) {
            return proj4('RD', 'WGS84', c2);
          });
        });
        break;
      case 'MultiPolygon':
        record.geometry.coordinates = record.geometry.coordinates.map(function(c1) {
          return c1.map(function(c2) {
            return c2.map(function(c3) {
              return proj4('RD', 'WGS84', c3);
            });
          });
        });
        break;
      default:
        throw new Error('GeoJSON type not recognized: ' + record.geometry.type);
    }

    return esClient.index({
      index: index,
      type: type,
      id: record.properties[idProperty],
      body: record
    }).catch(function(err) {
      console.error('Error importing: ' + record.properties[idProperty]);
      return importRecord(index, type, idProperty, nameProperty);
    }).then(function() {
      return importRecord(index, type, idProperty, nameProperty);
    });
  })
}
