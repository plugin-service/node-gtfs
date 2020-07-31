const sqlString = require('sqlstring');

const { getDb } = require('../db');

const {
  formatOrderByClause,
  formatSelectClause,
  formatWhereClause
} = require('../utils');
const pathwaysModel = require('../../models/gtfs/pathways');

/*
 * Returns an array of all pathways that match the query parameters.
 */
exports.getPathways = async (query = {}, fields = [], orderBy = []) => {
  const db = await getDb();
  const tableName = sqlString.escape(pathwaysModel.filenameBase);
  const selectClause = formatSelectClause(fields);
  const whereClause = formatWhereClause(query);
  const orderByClause = formatOrderByClause(orderBy);

  return db.all(`${selectClause} FROM ${tableName} ${whereClause} ${orderByClause};`);
};
