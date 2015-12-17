var elasticsearch = require('elasticsearch'),
  createError = require('http-errors'),
  sendResponse = require('./sendResponse');

var esClient = new elasticsearch.Client({
  host: 'https://search-geo4web-if2ippqsoax25uzkvf7qkazw7m.eu-west-1.es.amazonaws.com',
  log: process.env.NODE_ENV === 'production' ? 'error' : 'trace'
});

module.exports = function(req, res) {
  var result;
  var uriSegments = req.path.substr(1).split('/');

  switch (uriSegments[0]) {
    case 'page':
      result = handleDbpediaPage(uriSegments);
      break;
    case 'resource':
      result = handleDbpediaResource(uriSegments);
      break;
    case 'doc':
      result = handlePldnDoc(uriSegments);
      break;
    case 'id':
      result = handlePldnId(uriSegments);
      break;
    case 'gemeente':
    case 'wijk':
    case 'buurt':
      result = handleRestResource(uriSegments);
      break;
    case 'unstructured':
      result = handleUnstructuredResource(uriSegments);
      break;
    default:
      result = handleHierarchicalResource(uriSegments);
  }

  result.then(function(data) {
    sendResponse(req, res, data);
  }).catch(function(err) {
    if (err.status === 303) {
      return res.redirect(303, err.message);
    }

    if (err.status === 404) {
      return res.status(err.status).send({
        message: err.message
      });
    }

    res.status(500).send({
      message: 'Internal Server Error'
    });
  });
};

function handleDbpediaPage(uriSegments) {
  return esClient.search(getDbpediaQuery(uriSegments))
    .then(function(result) {
      if (result.hits.total === 0) {
        throw new createError.NotFound();
      }

      return result.hits.hits[0]._source;
    });
}

function handleDbpediaResource(uriSegments) {
  return esClient.searchExists(getDbpediaQuery(uriSegments))
    .catch(function(err) {
      if (err && err.status === 404) {
        throw new createError.NotFound();
      }
    }).then(function(result) {
      throw createError(303, '/page/' + uriSegments[1]);
    });
}

function getDbpediaQuery(uriSegments) {
  var params = {
    index: 'wijken_buurten_2014',
    size: 1
  };

  if (matches = uriSegments[1].match(/^(.+)_\(gemeente\)$/)) {
    params.type = 'gemeente';
    params.body = {
      query: {
        filtered: {
          filter: {
            term: {
              'properties.GM_NAAM': matches[1].replace(/_/g, ' '),
            }
          }
        }
      }
    }
  } else if (matches = uriSegments[1].match(/^(.+),_(.+)_\(wijk\)$/)) {
    params.type = 'wijk';
    params.body = {
      query: {
        filtered: {
          filter: {
            and: [
              {
                term: {
                  'properties.GM_NAAM': matches[2].replace(/_/g, ' ')
                }
              },
              {
                term: {
                  'properties.WK_NAAM': matches[1].replace(/_/g, ' ')
                }
              }
            ]
          }
        }
      }
    }
  } else if (matches = uriSegments[1].match(/^(.+),_(.+)_\(buurt\)$/)) {
    params.type = 'buurt';
    params.body = {
      query: {
        filtered: {
          filter: {
            and: [
              {
                term: {
                  'properties.GM_NAAM': matches[2].replace(/_/g, ' ')
                }
              },
              {
                term: {
                  'properties.BU_NAAM': matches[1].replace(/_/g, ' ')
                }
              }
            ]
          }
        }
      }
    }
  }

  return params;
}

function handlePldnDoc(uriSegments) {
  return esClient.get({
    index: 'wijken_buurten_2014',
    type: uriSegments[1],
    id: uriSegments[2]
  }).then(function(result) {
    return result._source;
  });
}

function handlePldnId(uriSegments) {
  return esClient.exists({
    index: 'wijken_buurten_2014',
    type: uriSegments[1],
    id: uriSegments[2]
  }).then(function(exists) {
    if (exists === false) {
      throw new createError.NotFound();
    }

    throw createError(303, '/doc/' + uriSegments[1] + '/' + uriSegments[2]);
  });
}

function handleRestResource(uriSegments) {
  return esClient.get({
    index: 'wijken_buurten_2014',
    type: uriSegments[0],
    id: uriSegments[1]
  }).then(function(result) {
    return result._source;
  });
}

function handleUnstructuredResource(uriSegments) {
  var obj;
  var buffer = new Buffer(uriSegments[1], 'base64');

  try {
    obj = JSON.parse(buffer.toString());
  } catch(err) {
    throw new createError.NotFound();
  }

  return esClient.get({
    index: 'wijken_buurten_2014',
    type: obj.type,
    id: obj.id
  }).then(function(result) {
    return result._source;
  });
}

function handleHierarchicalResource(uriSegments) {
  var params = {
    index: 'wijken_buurten_2014',
    size: 1
  };

  if (uriSegments[2]) {
    params.type = 'buurt';
    params.body = {
      query: {
        filtered: {
          filter: {
            and: [
              {
                term: {
                  'properties.GM_NAAM': uriSegments[0].replace(/_/g, ' ')
                }
              },
              {
                term: {
                  'properties.BU_NAAM': uriSegments[2].replace(/_/g, ' '),
                }
              }
            ]
          }
        }
      }
    }
  } else if (uriSegments[1]) {
    params.type = 'wijk';
    params.body = {
      query: {
        filtered: {
          filter: {
            and: [
              {
                term: {
                  'properties.GM_NAAM': uriSegments[0].replace(/_/g, ' ')
                }
              },
              {
                term: {
                  'properties.WK_NAAM': uriSegments[1].replace(/_/g, ' '),
                }
              }
            ]
          }
        }
      }
    }
  } else {
    params.type = 'gemeente';
    params.body = {
      query: {
        filtered: {
          filter: {
            term: {
              'properties.GM_NAAM': uriSegments[0].replace(/_/g, ' ')
            }
          }
        }
      }
    }
  }

  return esClient.search(params).then(function(result) {
    if (result.hits.total === 0) {
      throw new createError.NotFound();
    }

    return result.hits.hits[0]._source;
  });
}
