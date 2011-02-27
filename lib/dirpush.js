#!/usr/bin/env node
(function () {
  "use strict";

  require('noop');

  String.prototype.reverse = function () {
    return this.split("").reverse().join("");
  }

  var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    walk = require('walk'),
    filepush = require("./filepush.js"),
    crypto = require('crypto'),
    //scannerDb = require("./scanner-db"),
    scannerDb = require('./scanner-sqlite3'),
    indexOn = require('./index-on');


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

  function create(start, options, cb) {
    cb = cb || noop;
    var scanResults = [],
      updateFile = './lastupdate.json',
      // inotifypp = inotify.create(true),
      blacklist = [/cache/i],
      max_packet_size = 1024 * 1024 * 2;

    function addWatches(lastUpdate){
      console.log(start);
      var walker = walk(start),
        lastBatch = 0;

      walker.on('directories', function (pathname, stats, next) {
        var i = 0, j, isblack, name;

        while(i < stats.length){
          name = stats[i].name;
          isblack = false;
          for (j = 0; j < blacklist.length; j += 1) {
            if (blacklist[j].test(name)) {
              stats.splice(i, 1); // effectual increment
              isblack = true;
              break;
            }
          }
          if (!isblack) {
            //inotifypp.watch(directive, pathname + name);
            i += 1;
          }
        }

        next();
      });

      walker.on('file', function (pathname, stat, next) {
        var newstat = {};

        if (!fullscan && stat.mtime <= lastUpdate) {
          return next();
        }

        //"dev": 234881026,
        //"ino": 2535386,
        newstat.mode = stat.mode;
        // "nlink": 1,
        newstat.uid = stat.uid;
        newstat.gid = stat.gid;
        //"rdev": 0,
        newstat.size = stat.size;
        //"blksize": 4096,
        //"blocks": 48,
        //"atime": "2011-02-24T20:04:09.000Z",
        newstat.mtime = stat.mtime.valueOf();
        //"ctime": "2011-02-24T20:04:09.000Z",
        newstat.name = stat.name;
        //"type": "file",

        newstat.path = path.join(pathname, stat.name);
        newstat.ext = path.extname(newstat.path).substring(1);
        newstat.rrelpath = path.dirname(newstat.path).reverse();
        newstat.qmd5 = crypto.createHash("md5").update(newstat.mtime.toString() + newstat.size + newstat.path).digest("hex");
        newstat.basename = path.basename(newstat.name, newstat.ext);

        scanResults.push(newstat);

        if (!(scanResults.length % 1000)) {
          console.log(scanResults.length.toString() + ' ' + newstat.path);
          scannerDb.insert(scanResults.slice(scanResults.length - 1000, scanResults.length), function (err) {
            if (err) {
              console.log(err);
            }
            lastBatch = scanResults.length;
            console.log('Saved 1k batch in db');
            next();
          });
        } else {
          next();
        }
      });

      walker.on('end', function(){
        console.log("End recursion. " + scanResults.length + " files found.");

        if (!scanResults.length) {
          return cb(null);
        }

        // Insert any leftovers
        scannerDb.insert(scanResults.slice(lastBatch, scanResults.length), processScan);

        function processScan(err) {
          var allStats,
            stop;

          if (err) {
            throw err;
          }

          // TODO compare against last scan
          scanResults.sort(sortBySizeAndTime);

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

          processBatch();
        }
      });
    }

    // TODO full scan every day
    // short scan every hour
    var fullscan = true || false,
      nodate = new Date(-9999999999999999);

    fs.readFile(updateFile, function (err, data) {
      var date;
      if (data) {
        try {
          date = new Date(JSON.parse(data).lastUpdate);
        } catch (e) {}
      }
      if (!date) {
        date = nodate;
        fullscan = true;
      }
      console.log(date);
      addWatches(date);
    });
  }

  module.exports = create;
}());
