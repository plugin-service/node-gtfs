const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');
let db;

exports.openDb = async config => {
  if (!db) {
    db = await sqlite.open({
      filename: config.sqlitePath || ':memory:',
      driver: sqlite3.Database
    });
  }

  return db;
};
