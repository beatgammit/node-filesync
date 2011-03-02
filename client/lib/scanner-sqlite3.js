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
    db.exec(statement, function (err) {
      if (err) {
        cb(err);
      }
      statement = sqlitize3.update_many(table, values, { 
        key: "qmd5", 
        include: ["updated_on"]
      });
      db.exec(statement, cb);
    });
  }

  function confirmFilesUploaded(values, cb) {
    var statement,
      table,
      tablename = 'filequeue';

    directive.tables.forEach(function (_table) {
      if (tablename === _table.name) {
        table = _table;
      }
    });

    values.forEach(function (value) {
      value.uploaded = 1; // true
    });

    statement = sqlitize3.update_many(table, values, { 
      key: "qmd5", 
      include: ["uploaded", "md5"]
    });
    //console.log(statement);
    db.exec(statement, cb);
  }

  function getQueue(cb) {
    // TODO write generator
    var statement = "SELECT * FROM filequeue WHERE uploaded IS NULL ORDER BY mtime DESC LIMIT 1000;";
    db.all(statement, cb);
  }

  module.exports = {
    ready: ready,
    insert: insertFiles,
    confirmUploaded: confirmFilesUploaded,
    getQueue: getQueue
  };
}());
