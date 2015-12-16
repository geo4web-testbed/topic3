var elasticsearch = require('elasticsearch');

var esClient = new elasticsearch.Client({
  host: 'https://search-geo4web-if2ippqsoax25uzkvf7qkazw7m.eu-west-1.es.amazonaws.com',
  log: process.env.NODE_ENV === 'production' ? 'error' : 'trace'
});

module.exports = function(req, res) {
  var result;
  var uriSegments = req.path.substr(1).split('/');

  switch (uriSegments[0]) {
    case 'page':
      result = handleDbpediaPage(uriSegments, res);
    case 'resource':
      result = handleDbpediaResource(uriSegments, res);
    case 'doc':
      result = handlePldnDoc(uriSegments, res);
    case 'id':
      result = handlePldnId(uriSegments, res);
    case 'gemeente':
    case 'wijk':
    case 'buurt':
      result = handleRestResource(uriSegments, res);
    case 'unstructured':
      result = handleUnstructuredResource(uriSegments, res);
    default:
      result = handleHierarchicalResource(uriSegments, res);
  }

  result.catch(function(err) {
    if (err.status === 404) {
      return notFoundError(res);
    }

    unknownServerError(res);
  })
};

function notFoundError(res) {
  res.status(404).send({
    message: 'Not found.'
  });
}

function unknownServerError(res) {
  res.status(500).send({
    message: 'Unknown server error.'
  });
}

function handleDbpediaPage(uriSegments, res) {
  return esClient.search(getDbpediaQuery(uriSegments))
    .then(function(result) {
      if (result.hits.total === 0) {
        return notFoundError(res);
      }

      res.send(result.hits.hits[0]._source);
    });
}

function handleDbpediaResource(uriSegments, res) {
  return esClient.searchExists(getDbpediaQuery(uriSegments))
    .then(function(result) {
      res.redirect(303, '/page/' + uriSegments[1]);
    }).catch(function(err) {
      if (err && err.status === 404) {
        return notFoundError(res);
      }
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
  } else if (matches = uriSegments[1].match(/^(.+),_(.+)\(wijk\)$/)) {
    params.type = 'wijk';
    params.body = {
      query: {
        filtered: {
          filter: {
            term: {
              'properties.WK_NAAM': matches[1].replace(/_/g, ' '),
              'properties.GM_NAAM': matches[2].replace(/_/g, ' ')
            }
          }
        }
      }
    }
  } else if (matches = uriSegments[1].match(/^(.+),_(.+)\(buurt\)$/)) {
    params.type = 'buurt';
    params.body = {
      query: {
        filtered: {
          filter: {
            term: {
              'properties.BU_NAAM': matches[1].replace(/_/g, ' '),
              'properties.GM_NAAM': matches[2].replace(/_/g, ' ')
            }
          }
        }
      }
    }
  }

  return params;
}

function handlePldnDoc(uriSegments, res) {
  return esClient.get({
    index: 'wijken_buurten_2014',
    type: uriSegments[1],
    id: uriSegments[2]
  }).then(function(result) {
    res.send(result._source);
  });
}

function handlePldnId(uriSegments, res) {
  esClient.exists({
    index: 'wijken_buurten_2014',
    type: uriSegments[1],
    id: uriSegments[2]
  }, function (err, exists) {
    if (exists === false) {
      return notFoundError(res);
    }

    res.redirect(303, '/doc/' + uriSegments[1] + '/' + uriSegments[2]);
  });
}

function handleRestResource(uriSegments, res) {
  return esClient.get({
    index: 'wijken_buurten_2014',
    type: uriSegments[0],
    id: uriSegments[1]
  }).then(function(result) {
    res.send(result._source);
  });
}

function handleUnstructuredResource(uriSegments, res) {
  var obj;
  var buffer = new Buffer(uriSegments[1], 'base64');

  try {
    obj = JSON.parse(buffer.toString());
  } catch(err) {
    return notFoundError(res);
  }

  return esClient.get({
    index: 'wijken_buurten_2014',
    type: obj.type,
    id: obj.id
  }).then(function(result) {
    res.send(result._source);
  });
}

function handleHierarchicalResource(uriSegments, res) {
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
            term: {
              'properties.BU_NAAM': uriSegments[2].replace(/_/g, ' '),
              'properties.GM_NAAM': uriSegments[0].replace(/_/g, ' ')
            }
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
            term: {
              'properties.WK_NAAM': uriSegments[1].replace(/_/g, ' '),
              'properties.GM_NAAM': uriSegments[0].replace(/_/g, ' ')
            }
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
      return notFoundError(res);
    }

    res.send(result.hits.hits[0]._source);
  });
}
