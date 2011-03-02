(function () {
  "use strict";

  require('noop');

  var sqlite3 = require('sqlite3').verbose(),
    future = require('futures').future(),
    sqlitize = require('./sqlitize3'),
    directive = require('./sql-directive'),
    dbpath = require('./config').dbpath,
    db = new sqlite3.Database(dbpath, createTable);

  function createTable(err) {
    if (err) {
      return future.fulfill(err);
    }
    directive.tables.forEach(function (table) {
      sqlitize.table(table, function (err, sql) {
        db.exec(sql, function (err) {
          future.fulfill(err, sql);
        });
      });
    });
  };

  module.exports = {
    ready: future.when
  };
  
}());
