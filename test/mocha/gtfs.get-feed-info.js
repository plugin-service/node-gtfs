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

describe('gtfs.getFeedInfo():', () => {
  before(async () => {
    db = await openDb(config);
    await gtfs.import(config);
  });

  after(async () => {
    await db.close();
  });

  it('should return empty array if no feed info', async () => {
    const feedPublisherName = 'not_real';

    const results = await gtfs.getFeedInfo(config, {
      feed_publisher_name: feedPublisherName
    });
    should.exists(results);
    results.should.have.length(0);
  });
});
