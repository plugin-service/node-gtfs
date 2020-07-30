/* eslint-env mocha */

const path = require('path');
const should = require('should');

const { openDb } = require('../../lib/db');
const gtfs = require('../..');

const config = {
  agencies: [{
    agency_key: 'caltrain',
    path: path.join(__dirname, '../fixture/caltrain_20160406.zip')
  }],
  verbose: false
};

let db;

describe('gtfs.getStopAttributes():', () => {
  before(async () => {
    db = await openDb(config);
    await gtfs.import(config);
  });

  after(async () => {
    await db.close();
  });

  it('should return empty array if no stop attributes', async () => {
    const stopId = 'fake-stop-id';

    const results = await gtfs.getStopAttributes(config, {
      stop_id: stopId
    });
    should.exists(results);
    results.should.have.length(0);
  });
});
