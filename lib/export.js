/* eslint-disable no-use-extend-native/no-use-extend-native */

const path = require('path');

const _ = require('lodash');
const fs = require('fs-extra');
const sanitize = require('sanitize-filename');
const stringify = require('csv-stringify/lib/sync');
const sqlString = require('sqlstring');
const Promise = require('bluebird');

const { openDb } = require('./db');
const models = require('../models/models');
const fileUtils = require('./file-utils');
const logUtils = require('./log-utils');
const utils = require('./utils');

module.exports = async config => {
  const log = logUtils.log(config);
  const db = await openDb(config);

  const agencyCount = config.agencies.length;
  log(`Starting GTFS export for ${agencyCount} ${utils.pluralize('file', agencyCount)}`);

  const agencyKey = config.agencies[0].agency_key;
  const exportPath = path.join(process.cwd(), 'gtfs-export', sanitize(agencyKey));

  await fileUtils.prepDirectory(exportPath);

  // Loop through each GTFS file
  const exportedFiles = await Promise.mapSeries(models, async model => {
    const filepath = path.join(exportPath, `${model.filenameBase}.txt`);
    const tableName = sqlString.escape(model.filenameBase);
    const lines = await db.all(`SELECT * FROM ${tableName};`);

    if (!lines || lines.length === 0) {
      log(`Skipping (no data) - ${model.filenameBase}.txt\r`);
      return;
    }

    const excludeColumns = [
      'id',
      'arrival_timestamp',
      'departure_timestamp',
      'start_timestamp',
      'end_timestamp'
    ];

    const columns = _.without(model.schema.map(column => column.name), ...excludeColumns);
    const fileText = stringify(lines, { columns, header: true });
    await fs.writeFile(filepath, fileText);

    log(`Exporting - ${model.filenameBase}.txt\r`);

    return `${model.filenameBase}.txt`;
  });

  if (_.compact(exportedFiles).length === 0) {
    log(`${agencyKey}: No data found for agency_key=${agencyKey}. Check config.json.`);
    return;
  }

  log(`${agencyKey}: Completed GTFS export to ${exportPath}`);

  log(`Completed GTFS export for ${agencyCount} ${utils.pluralize('file', agencyCount)}\n`);
};
