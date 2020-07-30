const sqlString = require('sqlstring');

const { openDb } = require('../db');

const {
  formatOrderByClause,
  formatSelectClause,
  formatWhereClause
} = require('../utils');
const transfersModel = require('../../models/gtfs/transfers');

/*
 * Returns an array of all agencies that match the query parameters.
 */
exports.getTransfers = async (config, query = {}, fields = [], orderBy = []) => {
  const db = await openDb(config);
  const tableName = sqlString.escape(transfersModel.filenameBase);
  const selectClause = formatSelectClause(fields);
  const whereClause = formatWhereClause(query);
  const orderByClause = formatOrderByClause(orderBy);

  return db.all(`${selectClause} FROM ${tableName} ${whereClause} ${orderByClause};`);
};
