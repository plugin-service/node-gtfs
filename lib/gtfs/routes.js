const _ = require('lodash');
const sqlString = require('sqlstring');

const { openDb } = require('../db');

const {
  formatOrderByClause,
  formatSelectClause,
  formatWhereClause
} = require('../utils');
const routesModel = require('../../models/gtfs/routes');

/*
 * Returns an array of routes that match the query parameters. A `stop_id`
 * query parameter may be passed to find all routes that contain that stop.
 */
exports.getRoutes = async (config, query = {}, fields = [], orderBy = []) => {
  const db = await openDb(config);
  const tableName = sqlString.escape(routesModel.filenameBase);
  const selectClause = formatSelectClause(fields);
  let whereClause = '';
  const orderByClause = formatOrderByClause(orderBy);

  if (query.stop_id === undefined) {
    whereClause = formatWhereClause(query);
  } else {
    const whereClauses = Object.entries(_.omit(query, 'stop_id')).map(([key, value]) => {
      return `${sqlString.escapeId(key)} = ${sqlString.escape(value)}`;
    });

    const stoptimes = await db.all('SELECT DISTINCT trip_id FROM stop_times WHERE stop_id = ?;', [query.stop_id]);

    if (stoptimes.length > 0) {
      const tripWhereClause = stoptimes.map(stoptime => `trip_id = ${sqlString.escape(stoptime.trip_id)}`).join(' OR ');
      const trips = await db.all(`SELECT DISTINCT route_id FROM trips WHERE ${tripWhereClause}`);

      if (trips.length > 0) {
        whereClauses.push(`(${trips.map(trip => `route_id = ${sqlString.escape(trip.route_id)}`).join(' OR ')})`);
      }

      if (whereClauses.length > 0) {
        whereClause += `WHERE ${whereClauses.join(' AND ')}`;
      }
    }
  }

  return db.all(`${selectClause} FROM ${tableName} ${whereClause} ${orderByClause};`);
};
