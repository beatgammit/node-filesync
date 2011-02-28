(function () {
  "use strict";

  var http = require('http');

  function processScan(err) {
    var allStats,
      stop;

    if (err) {
      throw err;
    }

    // TODO compare against last scan
    scanResults.sort(sortBySizeAndTime);

    processBatch();
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

}());
