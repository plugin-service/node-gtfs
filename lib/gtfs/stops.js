const _ = require('lodash');
const sqlString = require('sqlstring');

const { getDb } = require('../db');

const {
  formatOrderByClause,
  formatSelectClause
} = require('../utils');
const geojsonUtils = require('../geojson-utils');
const stopsModel = require('../../models/gtfs/stops');
const { getAgencies } = require('./agencies');

async function getTripIdsFromTrips(tripQuery) {
  const db = await getDb();
  const whereClauses = [];

  if (tripQuery.route_id !== undefined) {
    whereClauses.push(`route_id = ${sqlString.escape(tripQuery.route_id)}`);
  }

  if (tripQuery.trip_id !== undefined) {
    whereClauses.push(`trip_id = ${sqlString.escape(tripQuery.trip_id)}`);
  }

  if (tripQuery.service_id !== undefined) {
    whereClauses.push(`service_id = ${sqlString.escape(tripQuery.service_id)}`);
  }

  if (tripQuery.direction_id !== undefined) {
    whereClauses.push(`direction_id = ${sqlString.escape(tripQuery.direction_id)}`);
  }

  if (whereClauses.length === 0) {
    return [];
  }

  const trips = await db.all(`SELECT trip_id FROM trips WHERE ${whereClauses.join(' AND ')}`);

  return trips.map(trip => trip.trip_id);
}

/*
 * Returns an array of stops that match the query parameters. A `route_id`
 * query parameter may be passed to find all shapes for a route. A `trip_id`
 * query parameter may be passed to find all shapes for a trip. A
 * `direction_id` query parameter may be passed to find all shapes for a direction.
 */
exports.getStops = async (query = {}, fields = [], orderBy = []) => {
  const db = await getDb();
  const tableName = sqlString.escape(stopsModel.filenameBase);
  const selectClause = formatSelectClause(fields);
  let whereClause = '';
  const orderByClause = formatOrderByClause(orderBy);
  const whereClauses = [];

  const stopQuery = _.omit(query, ['route_id', 'trip_id', 'service_id', 'direction_id']);
  const tripQuery = _.pick(query, ['route_id', 'trip_id', 'service_id', 'direction_id']);

  for (const [key, value] of Object.entries(stopQuery)) {
    whereClauses.push(`${sqlString.escapeId(key)} = ${sqlString.escape(value)}`);
  }

  if (Object.values(tripQuery).length > 0) {
    const tripIds = await getTripIdsFromTrips(tripQuery);

    if (tripIds.length === 0) {
      // No trips match query, so return empty array
      return [];
    }

    const stoptimes = await db.all(`SELECT DISTINCT stop_id FROM stop_times WHERE trip_id IN (${tripIds.map(() => '?').join(', ')})`, tripIds);
    const stopIds = stoptimes.map(stoptime => stoptime.stop_id);

    if (stopIds.length === 0) {
      // No stoptimes match query, so return empty array
      return [];
    }

    whereClauses.push(`stop_id IN (${stopIds.map(stopId => sqlString.escape(stopId)).join(', ')})`);
  }

  if (whereClauses.length > 0) {
    whereClause = `WHERE ${whereClauses.join(' AND ')}`;
  }

  return db.all(`${selectClause} FROM ${tableName} ${whereClause} ${orderByClause};`);
};

/*
 * Returns geoJSON with stops for the `agencyKey` specified, optionally limited
 * to the `stopIds` specified
 */
exports.getStopsAsGeoJSON = async (query = {}) => {
  const db = await getDb();
  const stops = await exports.getStops(query);

  // Get all agencies for reference
  const agencies = await getAgencies();

  const preparedStops = await Promise.all(stops.map(async stop => {
    stop.agency_name = agencies[0].agency_name;
    stop.routes = [];

    const stoptimes = await db.all('SELECT DISTINCT trip_id FROM stop_times WHERE stop_id = ?', [stop.stop_id]);
    const tripIds = stoptimes.map(stoptime => stoptime.trip_id);

    if (tripIds.length > 0) {
      const trips = await db.all(`SELECT DISTINCT route_id FROM trips WHERE trip_id IN (${tripIds.map(() => '?').join(', ')})`, tripIds);
      const routeIds = trips.map(trip => trip.route_id);

      if (routeIds.length > 0) {
        const routes = await db.all(`SELECT * FROM routes WHERE route_id IN (${routeIds.map(() => '?').join(', ')})`, routeIds);

        stop.routes = _.orderBy(routes, route => Number.parseInt(route.route_short_name, 10));
      }
    }

    return stop;
  }));

  return geojsonUtils.featuresToGeoJSON(geojsonUtils.stopsToGeoJSONFeatures(preparedStops));
};
