(function () {
  "use strict";

  require('noop');
  require('remedial');

  var Futures = require('futures'),
    future = Futures.future(),
    sqlite3 = require('sqlite3'),
    sqlitize3 = require('./sqlitize3'),
    directive = require('./sql-directive'),
    dbpath = require('./config').dbpath,
    db = new sqlite3.Database(dbpath, future.fulfill);

  function ready(cb) {
    if ('function' !== typeof cb) {
      throw new Error('ready(cb) accepts a function');
    }
    future.when(cb);
  }

  function insertFiles(values, cb) {
    var statement,
      table,
      tablename = 'filequeue';

    directive.tables.forEach(function (_table) {
      if (tablename === _table.name) {
        table = _table;
      }
    });

    statement = sqlitize3.insert_many(table, values, { resolve: "ignore" });
    //console.log(statement);
    db.exec(statement, cb);
  }

  module.exports = {
    ready: ready,
    insert: insertFiles
  };
}());
