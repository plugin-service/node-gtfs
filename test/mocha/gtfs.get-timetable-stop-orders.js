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

describe('gtfs.getTimetableStopOrders():', () => {
  before(async () => {
    db = await openDb(config);
    await gtfs.import(config);
  });

  after(async () => {
    await db.close();
  });

  it('should return empty array if no timetable stop orders', async () => {
    const timetableId = 'fake-timetable-id';

    const results = await gtfs.getTimetableStopOrders(config, {
      timetable_id: timetableId
    });
    should.exists(results);
    results.should.have.length(0);
  });
});
