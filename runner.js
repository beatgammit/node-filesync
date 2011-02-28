(function () {
  "use strict";

  require('noop');
  require('long-stack-traces');

  var filesyncDb = require('./lib/filesync-db'),
    filescan = require("./lib/filescan"),
    startDir = './tests',
    //startDir = '/Users/coolaj86',
    options = {
      host: '192.168.1.101', 
      //host: 'localhost', 
      port: 8022,
      user: 'coolaj86',
      password: 'cr4zym0nk3y'
    };

  function handleHttpResponse(response) {
    if (!response) {
      console.log("END: The eagle never took off");
      return;
    }
    response.on('data', function (data) {
      //console.log(data.toString());
    });
    response.on('end', function () {
      console.log("END: eagle landed hard core");
    });
  }

  function run() {
    filesyncDb.ready(function (err, sql) {
      console.log(sql);
      throwop(err);
      /*
      if (update.sync < update.fullscan) {
        sync(options, function () {
          return run();
        });
      }
      if (update.fullscan > 1.week.ago) {
        fullscan(options, function () {
          // update.fullscan.save()
          return run();
        });
      }
      if (update.scan > 1.hour.ago) {
        scan(options, function () {
          return run();
        });
      }
      */ 
      filescan(startDir, options, function (err, scanResults) {
        console.log(scanResults);
        console.log(err);
        // handleHttpResponse
      });
    });
  }

  run();
  /*
  setInterval(run, 30.minutes);
  */
}());
