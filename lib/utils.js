const sqlString = require('sqlstring');

/*
 * Pluralize a word based on count
 */
exports.pluralize = (word, count) => {
  return count === 1 ? word : `${word}s`;
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

exports.formatHexColor = color => {
  if (color !== null) {
    return `#${color}`;
  }
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
