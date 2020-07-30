const sqlString = require('sqlstring');

const { openDb } = require('../db');

const agencyModel = require('../../models/gtfs/agency');

/*
 * Returns an array of all agencies that match the query parameters.
 */
exports.getAgencies = async (config, query = {}, fields = [], orderBy = []) => {
  const db = await openDb(config);
  const tableName = sqlString.escape(agencyModel.filenameBase);

  let fieldsClause = '*';
  if (fields.length > 1) {
    fieldsClause = fields.map(sqlString.escapeId).join(', ');
  }

  let whereClause = '';
  const values = [];
  if (Object.keys(query).length > 0) {
    whereClause += ' WHERE ';
  
    whereClause += Object.entries(query).map(([key, value]) => {
      values.push(value);
      return `${sqlString.escapeId(key)} = ?`
    }).join(' AND ');
  }

  let orderByClause = '';
  if (orderBy.length > 0) {
    orderByClause += ' ORDER BY ';
  
    orderByClause += orderBy.map(([key, value]) => {
      const direction = value === 'DESC' ? 'DESC' : 'ASC';
      return `${sqlString.escapeId(key)} ${direction}`
    }).join(', ');
  }

  return db.all(`SELECT ${fieldsClause} FROM ${tableName}${whereClause}${orderByClause};`, values)
};
