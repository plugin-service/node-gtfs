const _ = require('lodash');

function consolidateShapes(shapes) {
  const keys = new Set();
  /* eslint-disable unicorn/no-reduce */
  const segmentsArray = shapes.map(shape => shape.reduce((memo, point, idx) => {
    if (idx > 0) {
      memo.push([
        [
          shape[idx - 1].shape_pt_lat,
          shape[idx - 1].shape_pt_lon
        ],
        [
          point.shape_pt_lat,
          point.shape_pt_lon
        ]
      ]);
    }

    return memo;
  }, []));
  /* eslint-enable unicorn/no-reduce */
  const consolidatedLineStrings = [];

  for (const segments of segmentsArray) {
    consolidatedLineStrings.push([]);

    for (const segment of segments) {
      const key1 = `${segment[0][0]},${segment[0][1]},${segment[1][0]},${segment[1][1]}`;
      const key2 = `${segment[1][0]},${segment[1][1]},${segment[0][0]},${segment[0][1]}`;
      const currentLine = _.last(consolidatedLineStrings);

      if (keys.has(key1) || keys.has(key2)) {
        consolidatedLineStrings.push([]);
      } else {
        // If its the first segment in a linestring, add both points
        if (currentLine.length === 0) {
          currentLine.push(segment[0]);
        }

        currentLine.push(segment[1]);
        keys.add(key1);
        keys.add(key2);
      }
    }
  }

  // Remove lineStrings with no length or with only one point
  return _.filter(_.compact(consolidatedLineStrings), lineString => lineString.length > 1);
}

exports.shapesToGeoJSONFeatures = (shapes, properties = {}) => {
  const shapeGroups = Object.values(_.groupBy(shapes, 'shape_id')).map(shapeGroup => _.sortBy(shapeGroup, 'shape_pt_sequence'));
  const lineStrings = consolidateShapes(shapeGroups);

  return lineStrings.map(lineString => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: lineString
    },
    properties
  }));
};

exports.stopsToGeoJSONFeatures = stops => {
  return stops.map(stop => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [
        stop.stop_lat,
        stop.stop_lon
      ]
    },
    properties: _.omit(stop, ['stop_lat', 'stop_lon'])
  }));
};

exports.featuresToGeoJSON = features => ({
  type: 'FeatureCollection',
  features
});
