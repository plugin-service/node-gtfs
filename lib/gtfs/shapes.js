const _ = require('lodash');
const sqlString = require('sqlstring');

const { openDb } = require('../db');

const {
  formatOrderByClause,
  formatSelectClause
} = require('../utils');
const geojsonUtils = require('../geojson-utils');
const shapesModel = require('../../models/gtfs/shapes');
const { getAgencies } = require('./agencies');
const { getRoutes } = require('./routes');

async function getShapeIdsFromTrips(config, tripQuery) {
  const db = await openDb(config);
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

  const trips = await db.all(`SELECT DISTINCT shape_id FROM trips WHERE ${whereClauses.join(' AND ')}`);

  return trips.map(trip => trip.shape_id);
}

/*
 * Returns array of shapes that match the query parameters. A `route_id`
 * query parameter may be passed to find all shapes for a route. A `trip_id`
 * query parameter may be passed to find all shapes for a trip. A
 * `direction_id` query parameter may be passed to find all shapes for a direction.
 */
exports.getShapes = async (config, query = {}, fields = [], orderBy = []) => {
  const db = await openDb(config);
  const tableName = sqlString.escape(shapesModel.filenameBase);
  const selectClause = formatSelectClause(fields);
  let whereClause = '';
  const orderByClause = formatOrderByClause(orderBy);
  const whereClauses = [];

  const shapeQuery = _.omit(query, ['route_id', 'trip_id', 'service_id', 'direction_id']);
  const tripQuery = _.pick(query, ['route_id', 'trip_id', 'service_id', 'direction_id']);

  for (const [key, value] of Object.entries(shapeQuery)) {
    whereClauses.push(`${sqlString.escapeId(key)} = ${sqlString.escape(value)}`);
  }

  if (Object.values(tripQuery).length > 0) {
    const shapeIds = await getShapeIdsFromTrips(config, tripQuery);

    if (shapeIds.length === 0) {
      // No trips match query, so return empty array
      return [];
    }

    whereClauses.push(`shape_id IN (${shapeIds.map(shapeId => sqlString.escape(shapeId)).join(', ')})`);
  }

  if (whereClauses.length > 0) {
    whereClause = `WHERE ${whereClauses.join(' AND ')}`;
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
