const _ = require('lodash');
const sqlString = require('sqlstring');

const { getDb } = require('../db');

const {
  formatHexColor,
  formatOrderByClause,
  formatSelectClause
} = require('../utils');
const geojsonUtils = require('../geojson-utils');
const shapesModel = require('../../models/gtfs/shapes');
const { getAgencies } = require('./agencies');
const { getRoutes } = require('./routes');

async function getShapeIdsFromTrips(tripQuery) {
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

  const trips = await db.all(`SELECT DISTINCT shape_id FROM trips WHERE ${whereClauses.join(' AND ')}`);

  return trips.map(trip => trip.shape_id);
}

/*
 * Returns array of shapes that match the query parameters. A `route_id`
 * query parameter may be passed to find all shapes for a route. A `trip_id`
 * query parameter may be passed to find all shapes for a trip. A
 * `direction_id` query parameter may be passed to find all shapes for a direction.
 */
exports.getShapes = async (query = {}, fields = [], orderBy = []) => {
  const db = await getDb();
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
    const shapeIds = await getShapeIdsFromTrips(tripQuery);

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
exports.getShapesAsGeoJSON = async (query = {}) => {
  const properties = {};

  const agencies = await getAgencies();
  properties.agency_name = agencies.length > 0 ? agencies[0].agency_name : '';

  const routeQuery = {};

  if (query.route_id !== undefined) {
    routeQuery.route_id = query.route_id;
  }

  const routes = await getRoutes(routeQuery);
  const features = [];

  await Promise.all(routes.map(async route => {
    const shapeQuery = { route_id: route.route_id, ..._.omit(query, 'route_id') };
    const shapes = await exports.getShapes(shapeQuery);

    const routeProperties = {
      ...properties,
      ...route,
      route_color: formatHexColor(route.route_color),
      route_text_color: formatHexColor(route.route_text_color)
    };
    features.push(...geojsonUtils.shapesToGeoJSONFeatures(shapes, routeProperties));
  }));

  return geojsonUtils.featuresToGeoJSON(features);
};
