const _ = require('lodash');
const sqlString = require('sqlstring');

const { openDb } = require('../db');

const {
  formatOrderByClause,
  formatSelectClause,
  formatWhereClause
} = require('../utils');
const geojsonUtils = require('../geojson-utils');
const stopsModel = require('../../models/gtfs/stops');
const { getAgencies } = require('./agencies');

/*
 * Returns an array of stops that match the query parameters.
 */
exports.getStops = async (config, query = {}, fields = [], orderBy = []) => {
  const db = await openDb(config);
  const tableName = sqlString.escape(stopsModel.filenameBase);
  const selectClause = formatSelectClause(fields);
  let whereClause = '';
  const orderByClause = formatOrderByClause(orderBy);

  if (query.route_id !== undefined) {
    const whereClauses = Object.entries(_.omit(query, 'route_id')).map(([key, value]) => {
      return `${sqlString.escapeId(key)} = ${sqlString.escape(value)}`;
    });

    const trips = await db.all('SELECT DISTINCT trip_id FROM trips WHERE route_id = ?', [query.route_id]);
    const stoptimes = await db.all(`SELECT DISTINCT stop_id FROM stop_times WHERE ${trips.map(trip => `trip_id = ${sqlString.escape(trip.trip_id)}`).join(' OR ')}`);

    if (stoptimes.length > 0) {
      whereClauses.push(`(${stoptimes.map(stoptime => `stop_id = ${sqlString.escape(stoptime.stop_id)}`).join(' OR ')})`);
    }

    if (whereClauses.length > 0) {
      whereClause += `WHERE ${whereClauses.join(' AND ')}`;
    }
  } else if (query.trip_id) {
    const whereClauses = Object.entries(_.omit(query, 'trip_id')).map(([key, value]) => {
      return `${sqlString.escapeId(key)} = ${sqlString.escape(value)}`;
    });

    const stoptimes = await db.all('SELECT DISTINCT stop_id FROM stop_times WHERE trip_id = ?', [query.trip_id]);

    if (stoptimes.length > 0) {
      whereClauses.push(`(${stoptimes.map(stoptime => `stop_id = ${sqlString.escape(stoptime.stop_id)}`).join(' OR ')})`);
    }

    if (whereClauses.length > 0) {
      whereClause += `WHERE ${whereClauses.join(' AND ')}`;
    }
  } else {
    whereClause = formatWhereClause(query);
  }

  return db.all(`${selectClause} FROM ${tableName} ${whereClause} ${orderByClause};`);
};

/*
 * Returns geoJSON with stops for the `agencyKey` specified, optionally limited
 * to the `stopIds` specified
 */
exports.getStopsAsGeoJSON = async (config, query = {}) => {
  const db = await openDb(config);
  const stops = await exports.getStops(config, query);

  // Get all agencies for reference
  const agencies = await getAgencies(config);

  const preparedStops = await Promise.all(stops.map(async stop => {
    stop.agency_name = agencies[0].agency_name;

    const stoptimes = await db.all('SELECT DISTINCT trip_id FROM stop_times WHERE stop_id = ?', [stop.stop_id]);

    if (stoptimes.length > 0) {
      const trips = await db.all(`SELECT DISTINCT route_id FROM trips WHERE (${stoptimes.map(stoptime => `trip_id = ${sqlString.escape(stoptime.trip_id)}`).join(' OR ')})`);
      const routes = await db.all(`SELECT * FROM routes WHERE (${trips.map(trip => `route_id = ${sqlString.escape(trip.route_id)}`).join(' OR ')})`);

      stop.routes = _.orderBy(routes, route => Number.parseInt(route.route_short_name, 10));
    } else {
      stop.routes = [];
    }

    return stop;
  }));

  return geojsonUtils.featuresToGeoJSON(geojsonUtils.stopsToGeoJSONFeatures(preparedStops));
};
