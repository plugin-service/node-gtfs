const sqlString = require('sqlstring');

const { openDb } = require('../db');

const {
  formatOrderByClause,
  formatSelectClause,
  formatWhereClause
} = require('../utils');
const calendarDatesModel = require('../../models/gtfs/calendar-dates');

/*
 * Returns an array of calendarDates that match the query parameters.
 */
exports.getCalendarDates = async (config, query = {}, fields = [], orderBy = []) => {
  const db = await openDb(config);
  const tableName = sqlString.escape(calendarDatesModel.filenameBase);
  const selectClause = formatSelectClause(fields);
  const whereClause = formatWhereClause(query);
  const orderByClause = formatOrderByClause(orderBy);

  return db.all(`${selectClause} FROM ${tableName} ${whereClause} ${orderByClause};`);
};
