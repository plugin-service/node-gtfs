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
}

let db;

describe('gtfs.getAgencies():', () => {
  before(async () => {
    db = await openDb(config);
    await gtfs.import(config);
  });

  after(async () => {
    await db.close();
  });

  it('should return empty array if no agencies exist', async () => {
    await db.all(`DELETE FROM agency;`);

    const results = await gtfs.getAgencies(config);
    should.exists(results);
    results.should.have.length(0);

    await gtfs.import(config);
  });

  it('should return expected agencies with no query', async () => {
    const results = await gtfs.getAgencies(config);

    const expectedResult = {
      id: 1,
      agency_id: 'CT',
      agency_name: 'Caltrain',
      agency_url: 'http://www.caltrain.com',
      agency_timezone: 'America/Los_Angeles',
      agency_lang: 'en',
      agency_phone: '800-660-4287',
      agency_fare_url: null,
      agency_email: null
    }

    should.exist(results);
    results.length.should.equal(1);
    expectedResult.should.match(results[0]);
  });

  it('should return expected agency for agency_id and agency_lang', async () => {
    const agencyId = 'CT';
    const agencyLand = 'en';

    const results = await gtfs.getAgencies(config, {
      agency_id: agencyId,
      agency_lang: agencyLand
    });

    const expectedResult = {
      id: 1,
      agency_id: 'CT',
      agency_name: 'Caltrain',
      agency_url: 'http://www.caltrain.com',
      agency_timezone: 'America/Los_Angeles',
      agency_lang: 'en',
      agency_phone: '800-660-4287',
      agency_fare_url: null,
      agency_email: null
    }

    should.exist(results);
    results.length.should.equal(1);
    expectedResult.should.match(results[0]);
  });

  it('should return only specific keys for expected agency for agency_id', async () => {
    const agencyId = 'CT';

    const results = await gtfs.getAgencies(config, {
      agency_id: agencyId
    }, [
      'agency_url',
      'agency_lang'
    ]);

    const expectedResult = {
      agency_url: 'http://www.caltrain.com',
      agency_lang: 'en'
    };

    should.exist(results);
    results.length.should.equal(1);
    expectedResult.should.match(results[0]);
  });
});
