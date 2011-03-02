(function () {
  "use strict";

  require('noop');
  require('long-stack-traces');

  var filesyncDb = require('./lib/filesync-db'),
    scannerDb = require('./lib/scanner-sqlite3'),
    filescan = require('./lib/filescan'),
    indexOn = require('./lib/index-on'),
    filepush = require('./lib/filepush'),
    max_packet_size = 1024 * 1024 * 20,
    batch,
    options = {
      start: './tests',
      host: '192.168.1.29', 
      //host: 'localhost', 
      port: 8022,
      user: 'coolaj86',
      password: 'cr4zym0nk3y'
    };

  function nextBatch() {
    var i,
      packet = 0,
      set,
      stop = batch.length,
      file;

    for (i = 0; i < batch.length; i += 1) {
      file = batch[i];
      packet += file.size;
      if (packet >= max_packet_size) {
        stop = i + 1;
        break;
      }
    }

    console.log('nextBatch-ing');
    console.log(stop);

    set = batch.splice(0, 10);//stop);
    console.log('set: ');
    console.log(set);
    if (!set.length) {
      return;
    }
    console.log('set: ');
    //console.log(set);
    uploadBatch(set);
  }

  function uploadBatch(set) {
    console.log('uploadBatch-ing');
    function handleHttpResponse(err, response) {
      var chunks = [];

      console.log('handleHttpResponse');
      if (err) {
        throw err;
      }
      if (!response) {
        console.log("END: The eagle never took off");
        return;
      }

      response.on('data', function (chunk) {
        // TODO process each chunk right away
        // TODO stream parse JSON
        chunks.push(chunk.toString());
      });

      response.on('end', function () {
        var data, allStats;

        console.log("END: eagle landed hard core");

        try {
          data = JSON.parse(chunks.join(''));
        } catch (e) {
          throw e;
        }

        if (data.length !== set.length) {
          console.log(new Error("number of items sent doesn't match items received"));
        }

        allStats = indexOn(set.slice(), 'qmd5');

        console.log(allStats);
        console.log(data);
        
        data.forEach(function (item) {
          var orig = allStats[item.qmd5];

          if (!orig) {
            console.log(new Error("got back results for a file that wasn't sent"));
            return;
          }

          if (item.err) {
            console.log(err);
            return;
          }

          allStats[item.qmd5] = undefined;
          delete allStats[item.qmd5];

          orig.md5 = item.md5;
          orig.uploaded = true;
        });

        if (Object.keys(allStats).length) {
          //console.log(allStats);
          console.log(new Error("items received didn't all match items sent"));
        }

        scannerDb.confirmUploaded(data, function (err) {
          nextBatch();
        });
      });
    }

    console.log('pre-filepush');
    filepush(options, set, handleHttpResponse);
  }

  function run() {
    filesyncDb.ready(function (err, sql) {
      //console.log(sql);
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
      setTimeout(run, 60 * 60 * 1000);
      */ 
      filescan(options, function (err, results) {
        if (err) {
          throw err;
        }
        // does both insert and update
        scannerDb.insert(results, function (err) {
          if (err) {
            throw err;
          }
          // XXX updateLastScan();
          console.log("post-insert");
          // TODO get number count, perhaps size
          scannerDb.getQueue(function (err, files) {
            if (err) {
              throw err;
            }
            console.log("post-getQueue");
            if (!files.length) {
              return console.log("No files in queue for upload");
            }
            batch = files;
            nextBatch();
          });
        });
      });
    });
  }

  run();
  /*
  setInterval(run, 30.minutes);
  */
}());
