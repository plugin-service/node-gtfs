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

describe('gtfs.getFareRules():', () => {
  before(async () => {
    db = await openDb(config);
    await gtfs.import(config);
  });

  after(async () => {
    await db.close();
  });

  it('should return empty array if no fare_rules', async () => {
    const routeId = 'not_real';

    const results = await gtfs.getFareRules(config, {
      route_id: routeId
    });
    should.exists(results);
    results.should.have.length(0);
  });

  it('should return expected fare_rules', async () => {
    const routeId = 'Bu-16APR';

    const results = await gtfs.getFareRules(config, {
      route_id: routeId
    });

    const expectedResult = {
      id: 36,
      fare_id: 'OW_2_20160228',
      route_id: 'Bu-16APR',
      origin_id: '6',
      destination_id: '5',
      contains_id: null
    };

    should.exist(results);
    results.length.should.equal(36);
    results.should.containEql(expectedResult);
  });
});
