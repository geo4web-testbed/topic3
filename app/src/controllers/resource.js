var elasticsearch = require('elasticsearch'),
  createError = require('http-errors'),
  sendResponse = require('../sendResponse');

var esClient = new elasticsearch.Client({
  host: 'https://search-geo4web-if2ippqsoax25uzkvf7qkazw7m.eu-west-1.es.amazonaws.com',
  log: process.env.NODE_ENV === 'production' ? 'error' : 'debug'
});

module.exports = function(req, res, next) {
  var result,
   uri = 'https://geo4web.apiwise.nl' + req.path,
   pathSegments = req.path.substr(1).split('/');

  switch (pathSegments[0]) {
    case 'page':
      result = handleDbpediaPage(uri, pathSegments);
      res.locals.uriStrategy = 'dbpedia';
      break;
    case 'resource':
      result = handleDbpediaResource(uri.replace('/resource/', '/page/'), pathSegments);
      res.locals.uriStrategy = 'dbpedia';
      break;
    case 'doc':
      result = handlePldnDoc(uri, pathSegments);
      res.locals.uriStrategy = 'pldn';
      break;
    case 'id':
      result = handlePldnId(uri.replace('/id/', '/doc/'), pathSegments);
      res.locals.uriStrategy = 'pldn';
      break;
    case 'gemeente':
    case 'wijk':
    case 'buurt':
      result = handleRestResource(uri, pathSegments);
      res.locals.uriStrategy = 'rest';
      break;
    case 'unstructured':
      result = handleUnstructuredResource(uri, pathSegments);
      res.locals.uriStrategy = 'unstructured';
      break;
    default:
      result = handleHierarchicalResource(uri, pathSegments);
      res.locals.uriStrategy = 'hierarchical';
  }

  result.then(function(data) {
    sendResponse(req, res, 'resource', data.doc);
  }).catch(function(err) {
    next(err);
  });
};

function handleDbpediaPage(uri, pathSegments) {
  try {
    var params = getDbpediaSearchParams(uri, pathSegments);
  } catch(err) {
    return Promise.reject(err);
  }

  return esClient.get(params)
    .then(function(result) {
      return result._source;
    });
}

function handleDbpediaResource(uri, pathSegments) {
  try {
    var params = getDbpediaSearchParams(uri, pathSegments);
  } catch(err) {
    return Promise.reject(err);
  }

  return esClient.exists(params)
    .then(function(exists) {
      if (!exists) {
        throw new createError.NotFound();
      }

      throw createError(303, '/page/' + pathSegments[1]);
    });
}

function getDbpediaSearchParams(uri, pathSegments) {
  var params = {
    index: 'wijken_buurten_2015',
    id: uri
  };

  if (matches = pathSegments[1].match(/^(.+)_\(gemeente\)$/)) params.type = 'gemeente';
  else if (matches = pathSegments[1].match(/^(.+),_(.+)_\(wijk\)$/)) params.type = 'wijk';
  else if (matches = pathSegments[1].match(/^(.+),_(.+)_\(buurt\)$/)) params.type = 'buurt';
  else throw new createError.NotFound();

  return params;
}

function handlePldnDoc(uri, pathSegments) {
  return esClient.get({
    index: 'wijken_buurten_2015',
    type: pathSegments[1],
    id: uri
  }).then(function(result) {
    return result._source;
  });
}

function handlePldnId(uri, pathSegments) {
  return esClient.exists({
    index: 'wijken_buurten_2015',
    type: pathSegments[1],
    id: uri
  }).then(function(exists) {
    if (!exists) {
      throw new createError.NotFound();
    }

    throw createError(303, '/doc/' + pathSegments[1] + '/' + pathSegments[2]);
  });
}

function handleRestResource(uri, pathSegments) {
  return esClient.get({
    index: 'wijken_buurten_2015',
    type: pathSegments[0],
    id: uri
  }).then(function(result) {
    return result._source;
  });
}

function handleUnstructuredResource(uri, pathSegments) {
  var obj;
  var buffer = new Buffer(pathSegments[1], 'base64');

  try {
    obj = JSON.parse(buffer.toString());
  } catch(err) {
    return Promise.reject(new createError.NotFound());
  }

  return esClient.get({
    index: 'wijken_buurten_2015',
    type: obj.type,
    id: uri
  }).then(function(result) {
    return result._source;
  });
}

function handleHierarchicalResource(uri, pathSegments) {
  var params = {
    index: 'wijken_buurten_2015',
    id: uri
  };

  if (pathSegments[2]) params.type = 'buurt';
  else if (pathSegments[1]) params.type = 'wijk';
  else params.type = 'gemeente';

  return esClient.get(params).then(function(result) {
    return result._source;
  });
}
