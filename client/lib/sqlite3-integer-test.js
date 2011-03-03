(function () {
  "use strict";

  var sqlite3 = require('sqlite3').verbose(),
    dbpath = './test-integer.sqlite3',
    db = new sqlite3.Database(dbpath, create),
    inty = new Date().valueOf();

  function create(err) {
    db.exec("CREATE TABLE IF NOT EXISTS inttest ( inty INTEGER );" +
      "INSERT INTO inttest VALUES ( " + inty + " );", function (err) {
      if (err) {
        throw err;
      }
      db.all("SELECT * FROM inttest", function (err, arr) {
        if (arr[0].inty !== inty) {
          console.log("fail", inty, arr[0].inty);
        } else {
          console.log('passes');
        }
      });
    });
  };

}());
