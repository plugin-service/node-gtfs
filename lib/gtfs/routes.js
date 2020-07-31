const _ = require('lodash');
const sqlString = require('sqlstring');

const { getDb } = require('../db');

const {
  formatOrderByClause,
  formatSelectClause
} = require('../utils');
const routesModel = require('../../models/gtfs/routes');

async function getTripIdsFromStoptimes(stoptimeQuery) {
  const db = await getDb();
  const whereClauses = [];

  if (stoptimeQuery.stop_id !== undefined) {
    whereClauses.push(`stop_id = ${sqlString.escape(stoptimeQuery.stop_id)}`);
  }

  if (whereClauses.length === 0) {
    return [];
  }

  const stoptimes = await db.all(`SELECT DISTINCT trip_id FROM stop_times WHERE ${whereClauses.join(' AND ')}`);

  return stoptimes.map(stoptime => stoptime.trip_id);
}

/*
 * Returns an array of routes that match the query parameters. A `stop_id`
 * query parameter may be passed to find all routes that contain that stop.
 */
exports.getRoutes = async (query = {}, fields = [], orderBy = []) => {
  const db = await getDb();
  const tableName = sqlString.escape(routesModel.filenameBase);
  const selectClause = formatSelectClause(fields);
  let whereClause = '';
  const orderByClause = formatOrderByClause(orderBy);
  const whereClauses = [];

  const routeQuery = _.omit(query, ['stop_id']);
  const stoptimeQuery = _.pick(query, ['stop_id']);

  for (const [key, value] of Object.entries(routeQuery)) {
    whereClauses.push(`${sqlString.escapeId(key)} = ${sqlString.escape(value)}`);
  }

  if (Object.values(stoptimeQuery).length > 0) {
    const tripIds = await getTripIdsFromStoptimes(stoptimeQuery);

    if (tripIds.length === 0) {
      // No stoptimes match query, so return empty array
      return [];
    }

    const trips = await db.all(`SELECT DISTINCT route_id FROM trips WHERE trip_id IN (${tripIds.map(tripId => sqlString.escape(tripId)).join(', ')})`);
    const routeIds = trips.map(trip => trip.route_id);

    if (routeIds.length === 0) {
      // No trips match query, so return empty array
      return [];
    }

    whereClauses.push(`route_id IN (${routeIds.map(routeId => sqlString.escape(routeId)).join(', ')})`);
  }

  if (whereClauses.length > 0) {
    whereClause = `WHERE ${whereClauses.join(' AND ')}`;
  }

  return db.all(`${selectClause} FROM ${tableName} ${whereClause} ${orderByClause};`);
};
