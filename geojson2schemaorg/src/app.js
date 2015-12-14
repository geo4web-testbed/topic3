'use strict';

var app = require('express')();

var geoJson = {
  "type": "MultiPolygon",
  "coordinates": [
    [[[102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0]]],
    [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
    [[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]]]
  ]
};

app.get('/', function(req, res) {
  return res.json(createGeoObjects(geoJson));
});

function createGeoObjects(geoJson) {
  switch (geoJson.type) {
    case 'Point':
      return createSchemaPoint(geoJson.coordinates);
    case 'LineString':
      return createSchemaLineString(geoJson.coordinates);
    case 'Polygon':
      // Holes in polygons are not supported by Schema.org, so they will be ignored
      return createSchemaPolygon(geoJson.coordinates[0]);
    case 'MultiPoint':
      var pointArray = [];
      for (var i = 0; i < geoJson.coordinates.length; i++) {
        pointArray.push(createSchemaPoint(geoJson.coordinates[i]));
      }
      return pointArray;
    case 'MultiPolygon':
      var polygonArray = [];
      for (var i = 0; i < geoJson.coordinates.length; i++) {
        polygonArray.push(createSchemaPolygon(geoJson.coordinates[i][0]));
      }
      return polygonArray;
    case 'MultiLineString':
      var lineStringArray = [];
      for (var i = 0; i < geoJson.coordinates.length; i++) {
        lineStringArray.push(createSchemaLineString(geoJson.coordinates[i]));
      }
      return lineStringArray;
    case 'GeometryCollection':
      var geometryArray = [];
      for (var i = 0; i < geoJson.geometries.length; i++) {
        geometryArray.push(createGeoObjects(geoJson.geometries[i]));
      }
      return geometryArray;
    default:
      throw new Error('This script requires a valid GeoJSON geometry object as input.');
  }
}

function createSchemaLineString(coordinates) {
  var schemaObject = {};
  schemaObject['@type'] = 'GeoShape';
  var geoString = '';
  var coordinatesLength = coordinates.length;
  for (var i = 0; i < coordinatesLength; i++) {
    geoString = geoString + coordinates[i][1] + ',' + coordinates[i][0];
    if (i < coordinatesLength - 1) {
      geoString = geoString + ' ';
    }
  }
  schemaObject.line = geoString;
  return schemaObject;
}

function createSchemaPoint(coordinates) {
  var schemaObject = {};
  schemaObject['@type'] = 'GeoCoordinates';
  schemaObject.latitude = coordinates[1];
  schemaObject.longitude = coordinates[0];
  return schemaObject;
}

function createSchemaPolygon(coordinates) {
  var schemaObject = {};
  schemaObject['@type'] = 'GeoShape';
  var geoString = '';
  var coordinatesLength = coordinates.length;
  for (var i = 0; i < coordinatesLength; i++) {
    geoString = geoString + coordinates[i][1] + ',' + coordinates[i][0];
    if (i < coordinatesLength - 1) {
      geoString = geoString + ' ';
    }
  }
  schemaObject.polygon = geoString;
  return schemaObject;
}

var server = app.listen(3000, function() {
  console.log('GeoJSON2SchemaOrg app listening at port %d...', server.address().port);
});
