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
  uriStrategies = ['dbpedia', 'hierarchical', 'rest', 'pldn', 'unstructured'],
  esClient = new elasticsearch.Client({
    host: 'https://search-geo4web-if2ippqsoax25uzkvf7qkazw7m.eu-west-1.es.amazonaws.com',
    // log: 'trace'
  });

Promise.resolve().then(function() {
  return esClient.indices.delete({ index: 'wijken_buurten_2015' });
}).catch(function(err) {
  // Do nothing when index does not exist
}).then(function() {
  return esClient.indices.create({
    index: 'wijken_buurten_2015',
    body: {
      mappings: {
        gemeente: {
          properties: {
            meta: {
              type: 'object',
              properties: {
                uriStrategy: {
                  type: 'string',
                  index: 'not_analyzed'
                }
              }
            },
            doc: {
              type: 'object',
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
            }
          }
        },
        wijk: {
          properties: {
            meta: {
              type: 'object',
              properties: {
                uriStrategy: {
                  type: 'string',
                  index: 'not_analyzed'
                }
              }
            },
            doc: {
              type: 'object',
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
            }
          }
        },
        buurt: {
          properties: {
            meta: {
              type: 'object',
              properties: {
                uriStrategy: {
                  type: 'string',
                  index: 'not_analyzed'
                }
              }
            },
            doc: {
              type: 'object',
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
            }
          }
        }
      }
    }
  });
}).then(function() {
  reader = Promise.promisifyAll(shapefile.reader('./shapefile/gem_2015'));
  return reader.readHeaderAsync();
}).then(function() {
  return importRecords('wijken_buurten_2015', 'gemeente', 'GM_CODE', 'GM_NAAM');
}).then(function() {
  reader = Promise.promisifyAll(shapefile.reader('./shapefile/wijk_2015'));
  return reader.readHeaderAsync();
}).then(function() {
  return importRecords('wijken_buurten_2015', 'wijk', 'WK_CODE', 'WK_NAAM');
}).then(function() {
  reader = Promise.promisifyAll(shapefile.reader('./shapefile/buurt_2015'));
  return reader.readHeaderAsync();
}).then(function() {
  return importRecords('wijken_buurten_2015', 'buurt', 'BU_CODE', 'BU_NAAM');
}).catch(function(err) {
  console.error(err);
});

function importRecords(index, type, idProperty, nameProperty) {
  return reader.readRecordAsync().then(function(record) {
    if (type === 'buurt') {
      return getWkNaam(record.properties.WK_CODE).then(function(wkNaam) {
        record.properties.WK_NAAM = wkNaam;
        return record;
      });
    }

    return record;
  }).then(function(record) {
    if (record === shapefile.end || record.properties[nameProperty] === null) {
      return;
    }

    var numId = parseInt(record.properties.GM_CODE.substring(2)),
      uriStrategy = uriStrategies[numId % uriStrategies.length];

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
      id: generateUri(record, uriStrategy, type, idProperty, nameProperty),
      body: {
        meta: { uriStrategy: uriStrategy },
        doc: record
      }
    }).catch(function(err) {
      console.error('Error importing: ' + record.properties[idProperty]);
      return importRecords(index, type, idProperty, nameProperty);
    }).then(function() {
      return importRecords(index, type, idProperty, nameProperty);
    });
  });
}

function getWkNaam(wkCode) {
  var params = {
    index: 'wijken_buurten_2015',
    type: 'wijk',
    size: 1,
    body: {
      query: {
        filtered: {
          filter: {
            term: {
              'doc.properties.WK_CODE': wkCode
            }
          }
        }
      }
    }
  };

  return esClient.search(params).then(function(result) {
    if (result.hits.total === 0) {
      throw new createError.NotFound();
    }

    return result.hits.hits[0]._source.doc.properties.WK_NAAM;
  });
}

function generateUri(record, uriStrategy, type, idProperty, nameProperty) {
  var uri = 'https://geo4web.apiwise.nl';

  switch (uriStrategy) {
    case 'dbpedia':
      uri = uri + '/page/' + escapeValue(record.properties[nameProperty]);
      if (type !== 'gemeente') uri = uri + ',_' + escapeValue(record.properties['GM_NAAM']);
      uri = uri + '_(' + type + ')';
      break;
    case 'hierarchical':
      if (type !== 'gemeente') uri = uri + '/' + escapeValue(record.properties['GM_NAAM']);
      if (type === 'buurt') uri = uri + '/' + escapeValue(record.properties['WK_NAAM']);
      uri = uri + '/' + escapeValue(record.properties[nameProperty]);
      break;
    case 'rest':
      uri = uri + '/' + type + '/' + record.properties[idProperty];
      break;
    case 'pldn':
      uri = uri + '/doc/' + type + '/' + record.properties[idProperty];
      break;
    case 'unstructured':
      uri = uri + '/unstructured/' + new Buffer(JSON.stringify({
        id: record.properties[idProperty],
        type: type
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
