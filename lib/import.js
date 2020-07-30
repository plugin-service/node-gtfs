/* eslint-disable no-use-extend-native/no-use-extend-native */

const path = require('path');

const _ = require('lodash');
const extract = require('extract-zip');
const fetch = require('node-fetch');
const fs = require('fs-extra');
const parse = require('csv-parse');
const sqlString = require('sqlstring');
const stripBomStream = require('strip-bom-stream');
const tmp = require('tmp-promise');
const untildify = require('untildify');
const Promise = require('bluebird');

const models = require('../models/models');
const { openDb } = require('./db');
const logUtils = require('./log-utils');
const utils = require('./utils');

const downloadFiles = async task => {
  task.log(`Downloading GTFS from ${task.agency_url}`);

  task.path = `${task.downloadDir}/${task.agency_key}-gtfs.zip`;

  const response = await fetch(task.agency_url, { method: 'GET', headers: task.agency_headers || {} });

  if (response.status !== 200) {
    throw new Error('Couldn’t download files');
  }

  const buffer = await response.buffer();

  await fs.writeFile(task.path, buffer);
  task.log('Download successful');
};

const getTextFiles = async folderPath => {
  const files = await fs.readdir(folderPath);
  return files.filter(filename => filename.slice(-3) === 'txt');
};

const readFiles = async task => {
  const gtfsPath = untildify(task.path);
  task.log(`Importing GTFS from ${task.path}\r`);
  if (path.extname(gtfsPath) === '.zip') {
    try {
      await extract(gtfsPath, { dir: task.downloadDir });
      const textFiles = await getTextFiles(task.downloadDir);

      // If no .txt files in this directory, check for subdirectories and copy them here
      if (textFiles.length === 0) {
        const files = await fs.readdir(task.downloadDir);
        const folders = files.map(filename => path.join(task.downloadDir, filename)).filter(source => fs.lstatSync(source).isDirectory());

        if (folders.length > 1) {
          throw new Error(`More than one subfolder found in zip file at ${task.path}. Ensure that .txt files are in the top level of the zip file, or in a single subdirectory.`);
        } else if (folders.length === 0) {
          throw new Error(`No .txt files found in ${task.path}. Ensure that .txt files are in the top level of the zip file, or in a single subdirectory.`);
        }

        const subfolderName = folders[0];
        const directoryTextFiles = await getTextFiles(subfolderName);

        if (directoryTextFiles.length === 0) {
          throw new Error(`No .txt files found in ${task.path}. Ensure that .txt files are in the top level of the zip file, or in a single subdirectory.`);
        }

        await Promise.all(directoryTextFiles.map(async fileName => fs.rename(path.join(subfolderName, fileName), path.join(task.downloadDir, fileName))));
      }
    } catch (error) {
      task.error(error);
      console.error(error);
      throw new Error(`Unable to unzip file ${task.path}`);
    }
  } else {
    // Local file is unzipped, just copy it from there.
    await fs.copy(gtfsPath, task.downloadDir);
  }
};

const createTables = async task => {
  return Promise.all(models.map(model => {
    if (!model.schema) {
      return;
    }

    const columns = model.schema.map(column => {
      const { name } = column;
      const type = sqlString.escape(column.type);
      let check = '';
      if (column.min !== undefined && column.max) {
        check = `CHECK( ${name} >= ${sqlString.escape(column.min)} AND ${name} <= ${sqlString.escape(column.max)} )`;
      } else if (column.min) {
        check = `CHECK( ${name} >= ${sqlString.escape(column.min)} )`;
      } else if (column.max) {
        check = `CHECK( ${name} <= ${sqlString.escape(column.max)} )`;
      }

      const primary = column.primary ? 'PRIMARY KEY' : '';
      const required = column.required ? 'NOT NULL' : '';
      const columnDefault = column.default ? 'DEFAULT ' + sqlString.escape(column.default) : '';
      return `${name} ${type} ${check} ${primary} ${required} ${columnDefault}`;
    });
    const tableName = sqlString.escape(model.filenameBase);
    return task.db.run(`CREATE TABLE ${tableName} (${columns.join(', ')});`);
  }));
};

const dropTables = async task => {
  return Promise.all(models.map(async model => {
    const tableName = sqlString.escape(model.filenameBase);
    return task.db.run(`DROP TABLE IF EXISTS ${tableName};`);
  }));
};

const formatLine = (line, lineNumber) => {
  // Remove null values
  for (const key in line) {
    if (line[key] === null) {
      delete line[key];
    }
  }

  // Convert fields that should be int
  const integerFields = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
    'start_date',
    'end_date',
    'date',
    'exception_type',
    'shape_pt_sequence',
    'payment_method',
    'transfers',
    'transfer_duration',
    'feed_start_date',
    'feed_end_date',
    'headway_secs',
    'exact_times',
    'route_type',
    'direction_id',
    'location_type',
    'wheelchair_boarding',
    'stop_sequence',
    'pickup_type',
    'drop_off_type',
    'use_stop_sequence',
    'transfer_type',
    'min_transfer_time',
    'wheelchair_accessible',
    'bikes_allowed',
    'timepoint',
    'timetable_sequence',
    'include_exceptions',
    'show_trip_continuation'
  ];

  integerFields.forEach(fieldName => {
    if (line[fieldName]) {
      line[fieldName] = Number.parseInt(line[fieldName], 10);
    } else {
      delete line[fieldName];
    }
  });

  // Convert fields that should be float
  const floatFields = [
    'price',
    'shape_dist_traveled',
    'shape_pt_lat',
    'shape_pt_lon',
    'stop_lat',
    'stop_lon'
  ];

  floatFields.forEach(fieldName => {
    if (line[fieldName]) {
      line[fieldName] = Number.parseFloat(line[fieldName]);
    } else {
      delete line[fieldName];
    }
  });

  // Check for valid coordinates
  const latitudeFields = [
    'shape_pt_lat',
    'stop_lat'
  ];

  for (const fieldName of latitudeFields) {
    if (line[fieldName] !== undefined) {
      if (line[fieldName] < -90 || line[fieldName] > 90) {
        throw new Error(`Invalid latitude in ${fieldName} on ${lineNumber}`);
      }
    }
  }

  const longitudeFields = [
    'shape_pt_lon',
    'stop_lon'
  ];

  for (const fieldName of longitudeFields) {
    if (line[fieldName] !== undefined) {
      if (line[fieldName] < -180 || line[fieldName] > 180) {
        throw new Error(`Invalid longitude in ${fieldName} on ${lineNumber}`);
      }
    }
  }

  // Convert to midnight timestamp
  const timestampFormat = [
    'start_time',
    'end_time',
    'arrival_time',
    'departure_time'
  ];

  for (const fieldName of timestampFormat) {
    if (line[fieldName]) {
      line[`${fieldName}stamp`] = utils.calculateHourTimestamp(line[fieldName]);
    }
  }

  return line;
};

const importLines = async (task, lines, model) => {
  if (lines.length === 0) {
    return;
  }

  const tableName = sqlString.escape(model.filenameBase);
  const fieldNames = _.intersection(model.schema.map(column => column.name), Object.keys(lines[0]));
  const formattedFieldNames = fieldNames.map(fieldName => sqlString.escape(fieldName)).join(', ');
  const placeholders = [];
  const values = [];

  while (lines.length) {
    const line = lines.pop();
    placeholders.push(`(${fieldNames.map(() => '?').join(', ')})`);
    for (const fieldName of fieldNames) {
      values.push(line[fieldName] === undefined ? 'NULL' : line[fieldName]);
    }
  }

  await task.db.run(`INSERT INTO ${tableName}(${formattedFieldNames}) VALUES${placeholders.join(',')}`, values);
};

const importFiles = task => {
  // Loop through each GTFS file
  return Promise.mapSeries(models, model => {
    return new Promise((resolve, reject) => {
      // Filter out excluded files from config
      if (task.exclude && _.includes(task.exclude, model.filenameBase)) {
        task.log(`Skipping - ${model.filenameBase}.txt\r`);
        return resolve();
      }

      const filepath = path.join(task.downloadDir, `${model.filenameBase}.txt`);

      if (!fs.existsSync(filepath)) {
        if (!model.nonstandard) {
          task.log(`Importing - ${model.filenameBase}.txt - No file found\r`);
        }

        return resolve();
      }

      task.log(`Importing - ${model.filenameBase}.txt\r`);

      const lines = [];
      let lineCount = 0;
      const chunkSize = 70;
      const parser = parse({
        columns: true,
        relax: true,
        trim: true,
        skip_empty_lines: true,
        ...task.csvOptions
      });

      parser.on('readable', async () => {
        let record;
        /* eslint-disable-next-line no-cond-assign */
        while (record = parser.read()) {
          lines.push(formatLine(record, parser.info.lines));
          lineCount += 1;

          // If we have a bunch of lines ready to insert, then do it
          if (lines.length >= chunkSize) {
            /* eslint-disable-next-line no-await-in-loop */
            await importLines(task, lines, model).catch(reject);
            task.log(`Importing - ${model.filenameBase}.txt - ${lineCount} lines imported\r`, true);
          }
        }
      });

      parser.on('end', async () => {
        // Insert all remaining lines
        await importLines(task, lines, model).catch(reject);
        task.log(`Importing - ${model.filenameBase}.txt - ${lineCount} lines imported\r`, true);

        resolve();
      });

      parser.on('error', reject);

      fs.createReadStream(filepath)
        .pipe(stripBomStream())
        .pipe(parser);
    })
      .catch(error => {
        throw error;
      });
  });
};

module.exports = async config => {
  const log = logUtils.log(config);
  const logError = logUtils.logError(config);
  const db = await openDb(config);

  const agencyCount = config.agencies.length;
  log(`Starting GTFS import for ${agencyCount} ${utils.pluralize('file', agencyCount)}`);

  await Promise.mapSeries(config.agencies, async agency => {
    if (!agency.agency_key) {
      throw new Error('No Agency Key provided.');
    }

    if (!agency.url && !agency.path) {
      throw new Error('No Agency URL or path provided.');
    }

    const { path, cleanup } = await tmp.dir({ unsafeCleanup: true });

    const task = {
      exclude: agency.exclude,
      agency_key: agency.agency_key,
      agency_url: agency.url,
      agency_headers: agency.headers || false,
      downloadDir: path,
      path: agency.path,
      csvOptions: config.csvOptions || {},
      db,
      log: (message, overwrite) => {
        log(`${task.agency_key}: ${message}`, overwrite);
      },
      error: message => {
        logError(message);
      }
    };

    if (task.agency_url) {
      await downloadFiles(task);
    }

    await readFiles(task);
    await dropTables(task);
    await createTables(task);
    await importFiles(task);

    cleanup();
    task.log('Completed GTFS import');
  });

  log(`Completed GTFS import for ${agencyCount} ${utils.pluralize('file', agencyCount)}\n`);
};
