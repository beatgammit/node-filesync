(function () {
  "use strict";

  var http = require('http'),
    scannerDb = require('scanner-sqlite3'),
    filepush = require('filepush');

  function sortBySizeAndTime(a, b) {
    // Files that have changed recently
    // are most likely to change again
    if (a.mtime > b.mtime) { return 1; }
    if (a.mtime < b.mtime) { return -1; }
    // smallest files are easiest to upload
    if (a.size > b.size) { return 1; }
    if (a.size < b.size) { return -1; }
    return 0;
  }

  function processScan(scanResults) {
    var allStats,
      stop;

    function pushBatch(response) {
      console.log("pushBatch");
      var chunks = [];
      response.on('data', function (chunk) {
        // TODO process each chunk right away
        // TODO stream parse JSON
        chunks.push(chunk.toString());
      });
      response.on('end', function () {
        var data = JSON.parse(chunks.join(''));

        if (data.length !== Object.keys(allStats).length) {
          console.log(new Error("sent and receive numbers mismatch"));
        }
        data.forEach(function (item) {
          var orig = allStats[item.qmd5];

          allStats[item.qmd5] = undefined;
          delete allStats[item.qmd5];

          if (!orig) {
            console.log(new Error("got back results for a file that wasn't sent"));
            return;
          }
          orig.md5 = item.md5;
          orig.saved = true;
        });
        if (Object.keys(allStats).length) {
          console.log(new Error("files didn't sync"));
        }

        processBatch();
      });
      cb(response)
    }

    function processBatch() {
      var i,
        packet = 0,
        set,
        file;

      for (i = 0; i < scanResults.length; i += 1) {
        file = scanResults[i];
        packet += file.size;
        if (packet >= max_packet_size) {
          stop = i + 1;
          break;
        }
      }

      set = scanResults.splice(0, stop);
      allStats = indexOn(set.slice(), 'qmd5');
      if (!set.length) {
        return;
      }
      console.log('set: ');
      console.log(set);
      filepush(options, set, pushBatch);
    }



    // TODO compare against last scan
    scanResults.sort(sortBySizeAndTime);
    processBatch();
  }

  module.exports = {
    push: processScan
  };
}());
