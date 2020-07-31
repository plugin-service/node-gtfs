const sqlString = require('sqlstring');

const { getDb } = require('../db');

const {
  formatOrderByClause,
  formatSelectClause,
  formatWhereClause
} = require('../utils');
const stopAttributesModel = require('../../models/non-standard/stop-attributes');

/*
 * Returns an array of all stop attributes that match the query parameters.
 */
exports.getStopAttributes = async (query = {}, fields = [], orderBy = []) => {
  const db = await getDb();
  const tableName = sqlString.escape(stopAttributesModel.filenameBase);
  const selectClause = formatSelectClause(fields);
  const whereClause = formatWhereClause(query);
  const orderByClause = formatOrderByClause(orderBy);

  return db.all(`${selectClause} FROM ${tableName} ${whereClause} ${orderByClause};`);
};
