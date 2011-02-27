(function () {
  "use strict";

  require('noop');

  var sqlite3 = require('sqlite3').verbose(),
    sqlitize = require('./sqlitize3'),
    directive = require('./sql-directive'),
    dbpath = require('./config').dbpath,
    db = new sqlite3.Database(dbpath, createTable);

  function createTable() {
    directive.tables.forEach(function (table) {
      sqlitize.table(table, function (err, sql) {
        console.log(sql);
        db.exec(sql, function (err) {
          throwop(err);
          console.log("Created Successfully");
        });
      });
    });
  };
  
  
}());
