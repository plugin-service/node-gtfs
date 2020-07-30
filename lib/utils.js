const sqlString = require('sqlstring');

/*
 * Pluralize a word based on count
 */
exports.pluralize = (word, count) => {
  return count === 1 ? word : `${word}s`;
};

/*
 * Extend a set of bounds with a point
 */
exports.extendBounds = (bounds, loc) => {
  if (!bounds) {
    bounds = {
      sw: [],
      ne: []
    };
  }

  if (bounds.sw[0] > loc[0] || !bounds.sw[0]) {
    bounds.sw[0] = loc[0];
  }

  if (bounds.ne[0] < loc[0] || !bounds.ne[0]) {
    bounds.ne[0] = loc[0];
  }

  if (bounds.sw[1] > loc[1] || !bounds.sw[1]) {
    bounds.sw[1] = loc[1];
  }

  if (bounds.ne[1] < loc[1] || !bounds.ne[1]) {
    bounds.ne[1] = loc[1];
  }

  return bounds;
};

/*
 * Calculates a center point from bounds
 */
exports.boundsCenter = bounds => {
  if (!bounds) {
    return;
  }

  const lat = ((bounds.ne[0] - bounds.sw[0]) / 2) + bounds.sw[0];
  const lon = ((bounds.ne[1] - bounds.sw[1]) / 2) + bounds.sw[1];
  return [lat, lon];
};

/*
 * Calculate seconds from midnight for HH:mm:ss / H:m:s
 */
exports.calculateHourTimestamp = time => {
  const split = time.split(':').map(d => Number.parseInt(d, 10));
  if (split.length !== 3) {
    return null;
  }

  return (split[0] * 3600) + (split[1] * 60) + split[2];
};

exports.formatSelectClause = fields => {
  let selectClause = 'SELECT ';
  if (fields.length > 1) {
    selectClause += fields.map(fieldName => sqlString.escapeId(fieldName)).join(', ');
  } else {
    selectClause += '*';
  }

  return selectClause;
};

exports.formatWhereClause = query => {
  let whereClause = '';

  if (Object.keys(query).length > 0) {
    whereClause += 'WHERE ';

    whereClause += Object.entries(query).map(([key, value]) => {
      return `${sqlString.escapeId(key)} = ${sqlString.escape(value)}`;
    }).join(' AND ');
  }

  return whereClause;
};

exports.formatOrderByClause = orderBy => {
  let orderByClause = '';

  if (orderBy.length > 0) {
    orderByClause += 'ORDER BY ';

    orderByClause += orderBy.map(([key, value]) => {
      const direction = value === 'DESC' ? 'DESC' : 'ASC';
      return `${sqlString.escapeId(key)} ${direction}`;
    }).join(', ');
  }

  return orderByClause;
};
