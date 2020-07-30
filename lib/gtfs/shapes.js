const _ = require('lodash');
const sqlString = require('sqlstring');

const { openDb } = require('../db');

const {
  formatOrderByClause,
  formatSelectClause,
  formatWhereClause
} = require('../utils');
const geojsonUtils = require('../geojson-utils');
const shapesModel = require('../../models/gtfs/shapes');
const { getAgencies } = require('./agencies');
const { getRoutes } = require('./routes');

/*
 * Returns array of shapes that match the query parameters. A `route_id`
 * query parameter may be passed to find all shapes for a route. A `trip_id`
 * query parameter may be passed to find all shapes for a trip.
 */
exports.getShapes = async (config, query = {}, fields = [], orderBy = []) => {
  const db = await openDb(config);
  const tableName = sqlString.escape(shapesModel.filenameBase);
  const selectClause = formatSelectClause(fields);
  let whereClause = '';
  const orderByClause = formatOrderByClause(orderBy);

  if (query.route_id !== undefined) {
    const whereClauses = Object.entries(_.omit(query, 'route_id')).map(([key, value]) => {
      return `${sqlString.escapeId(key)} = ${sqlString.escape(value)}`;
    });

    const trips = await db.all('SELECT DISTINCT shape_id FROM trips WHERE route_id = ?', [query.route_id]);

    if (trips.length > 0) {
      whereClauses.push(`(${trips.map(trip => `shape_id = ${sqlString.escape(trip.shape_id)}`).join(' OR ')})`);
    }

    if (whereClauses.length > 0) {
      whereClause += `WHERE ${whereClauses.join(' AND ')}`;
    }
  } else if (query.trip_id) {
    const whereClauses = Object.entries(_.omit(query, 'trip_id')).map(([key, value]) => {
      return `${sqlString.escapeId(key)} = ${sqlString.escape(value)}`;
    });

    const trips = await db.all('SELECT DISTINCT shape_id FROM trips WHERE trip_id = ?', [query.trip_id]);

    if (trips.length > 0) {
      whereClauses.push(`(${trips.map(trip => `shape_id = ${sqlString.escape(trip.shape_id)}`).join(' OR ')})`);
    }

    if (whereClauses.length > 0) {
      whereClause += `WHERE ${whereClauses.join(' AND ')}`;
    }
  } else if (query.service_id) {
    const whereClauses = Object.entries(_.omit(query, 'service_id')).map(([key, value]) => {
      return `${sqlString.escapeId(key)} = ${sqlString.escape(value)}`;
    });

    const trips = await db.all('SELECT DISTINCT shape_id FROM trips WHERE service_id = ?', [query.service_id]);

    if (trips.length > 0) {
      whereClauses.push(`(${trips.map(trip => `shape_id = ${sqlString.escape(trip.shape_id)}`).join(' OR ')})`);
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
 * Returns geoJSON of the shapes that match the query parameters. A `route_id`
 * query parameter may be passed to find all shapes for a route.
 */
exports.getShapesAsGeoJSON = async (config, query = {}) => {
  const properties = {};

  const agencies = await getAgencies(config);
  properties.agency_name = agencies.length > 0 ? agencies[0].agency_name : '';

  const routeQuery = {};

  if (query.route_id !== undefined) {
    routeQuery.route_id = query.route_id;
  }

  const routes = await getRoutes(config, routeQuery);
  const features = [];

  await Promise.all(routes.map(async route => {
    const shapeQuery = { route_id: route.route_id, ..._.omit(query, 'route_id') };
    const shapes = await exports.getShapes(config, shapeQuery);

    const routeProperties = { ...properties, ...route };
    features.push(...geojsonUtils.shapesToGeoJSONFeatures(shapes, routeProperties));
  }));

  return geojsonUtils.featuresToGeoJSON(features);
};
