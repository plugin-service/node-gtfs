const sqlString = require('sqlstring');

const { openDb } = require('../db');

const {
  formatOrderByClause,
  formatSelectClause,
  formatWhereClause
} = require('../utils');
const agencyModel = require('../../models/gtfs/agency');

/*
 * Returns an array of all agencies that match the query parameters.
 */
exports.getAgencies = async (config, query = {}, fields = [], orderBy = []) => {
  const db = await openDb(config);
  const tableName = sqlString.escape(agencyModel.filenameBase);
  const selectClause = formatSelectClause(fields);
  const whereClause = formatWhereClause(query);
  const orderByClause = formatOrderByClause(orderBy);

  return db.all(`${selectClause} FROM ${tableName} ${whereClause} ${orderByClause};`);
};
