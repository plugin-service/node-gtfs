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

describe('gtfs.getCalendars():', () => {
  before(async () => {
    db = await openDb(config);
    await gtfs.import(config);
  });

  after(async () => {
    await db.close();
  });

  it('should return empty array if no calendars', async () => {
    const serviceId = 'fake-service-id';

    const results = await gtfs.getCalendars(config, {
      service_id: serviceId
    });
    should.exists(results);
    results.should.have.length(0);
  });

  it('should return expected calendars', async () => {
    const results = await gtfs.getCalendars(config, {
      sunday: 1
    });

    const expectedResult = {
      service_id: 'CT-16APR-Caltrain-Sunday-02',
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 1,
      start_date: 20140323,
      end_date: 20190331
    };

    should.exist(results);
    results.length.should.equal(1);
    expectedResult.should.match(results[0]);
  });
});
