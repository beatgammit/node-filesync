#!/usr/bin/env node
(function () {
  "use strict";

  require('noop');

  String.prototype.reverse = function () {
    return this.split("").reverse().join("");
  }

  var mime = require('mime'),
    fs = require('fs'),
    path = require('path'),
    walk = require('walk'),
    crypto = require('crypto'),
    //scannerDb = require("./scanner-db"),
    scannerDb = require('./scanner-sqlite3'),
    indexOn = require('./index-on'),
    nodate = new Date(-9999999999999999);


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
    var scanResults = [],
      fullscan = options.fullscan || true,
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

        newstat.mode = stat.mode;
        newstat.uid = stat.uid;
        newstat.gid = stat.gid;
        newstat.size = stat.size;
        newstat.mtime = stat.mtime.valueOf();
        newstat.name = stat.name;

        newstat.ext = path.extname(newstat.name).substring(1);
        newstat.rpath = pathname.reverse();
        newstat.qmd5 = crypto.createHash("md5").update(newstat.mtime.toString() + newstat.size + newstat.path).digest("hex");
        newstat.basename = path.basename(newstat.name, '.' + newstat.ext);
        newstat.type = mime.lookup(newstat.ext);

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
          return cb(null, []);
        }

        // Insert any leftovers
        scannerDb.insert(scanResults.slice(lastBatch, scanResults.length), function (err) {
          cb(err, scanResults);
        });

      });
    }


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
