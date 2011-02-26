(function () {
  "use strict";

  require('noop');

  var fs = require('fs'),
    path = require('path'),
    fullscandb = path.join(__dirname, '../db/fullscans');

  function saveFullScan(allstats, cb) {
    var date = (new Date()).valueOf(),
      fullpath = path.join(fullscandb, date + '.json');

    fs.writeFile(fullpath, JSON.stringify(allstats), function (err) {
      if (err) {
        console.log(err.message);
      }
      doop(cb, [err]);
    });
  }

  function loadLastScan(cb) {
    fs.readdir(fullscandb, function (err, files) {
      if (err) {
        return cb(err);
      }
      files.sort(); // by date

      function readLastScan(file) {
        var err;
        if (!file) {
          err = new Error("readLastScan error: " + fullscandb);
          return cb(err);
        }
        var fullpath = path.join(fullscandb, file);
        fs.readFile(fullpath, function (err, data) {
          var json;
          if (data) {
            try {
              json = JSON.parse(data);
              return cb(err, json);
            } catch (e) {
              err = e;
            }
          }
          console.log("fs.readFile error: " + file);
          fs.unlink(fullpath, console.log);
          return readLastScan(files.pop());
        });
      }

      var file = files.pop();
      readLastScan(file);
    });
  }

  module.exports = {
    load: loadLastScan,
    save: saveFullScan
  };
}());
