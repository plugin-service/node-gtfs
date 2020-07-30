const sqlString = require('sqlstring');

const { openDb } = require('../db');

const {
  formatOrderByClause,
  formatSelectClause,
  formatWhereClause
} = require('../utils');
const attributionyModel = require('../../models/gtfs/attributions');

/*
 * Returns an array of all attributions that match the query parameters.
 */
exports.getAttributions = async (config, query = {}, fields = [], orderBy = []) => {
  const db = await openDb(config);
  const tableName = sqlString.escape(attributionyModel.filenameBase);
  const selectClause = formatSelectClause(fields);
  const whereClause = formatWhereClause(query);
  const orderByClause = formatOrderByClause(orderBy);

  return db.all(`${selectClause} FROM ${tableName} ${whereClause} ${orderByClause};`);
};
