'use strict';

const simplify = require('simplify-geojson');

module.exports = simplifyGeometry;

function simplifyGeometry(geometry, tolerance, decimals) {
  let result = simplify(geometry, tolerance);
  result.geometry.coordinates = roundCoordinates(result.geometry.coordinates, decimals);
  return result;
}

function roundCoordinates(coordinates, decimals) {
  return coordinates.map(c => {
    if (typeof c === 'number') {
      return c.toFixed(decimals);
    }

    return roundCoordinates(c, decimals);
  });
}
