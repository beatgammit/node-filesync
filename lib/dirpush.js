#!/usr/bin/env node
(function () {
  "use strict";

  require('noop');

  var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    //inotifypp = require('inotify-plusplus'),
    walk = require('walk'),
    filepush = require("./filepush.js"),
    crypto = require('crypto'),
    indexOn = require('./index-on');


  function sortBySizeAndTime(a, b) {
    // smallest files are easiest to upload
    if (a.size > b.size) { return 1; }
    if (a.size < b.size) { return -1; }
    // Files that have changed recently
    // are most likely to change again
    if (a.mtime > b.mtime) { return 1; }
    if (a.mtime < b.mtime) { return -1; }
    return 0;
  }

  function create(start, options, cb) {
    cb = cb || noop;
    var watchedDirs = [],
      updateFile = './lastupdate.json',
      // inotifypp = inotify.create(true),
      blacklist = [/cache/i],
      directive;

    directive = {
      close_write: true,
      create: true,
      delete_self: true,
      delete: true,
      modify: true,
      move: true,
      all_events: function(ev){
        fs.readFile(path.join(ev.watch, ev.name), function(err, data){
          if(!err && data){
            fs.writeFile(path.join("/home/jameson/.testNotify", ev.name), data, function(err){
              if(!err){
                console.log("File modified: " + ev.name);
              }
            });
          }
        });
      }
    };

    function addWatches(scanResults, lastUpdate){
      console.log(start);
      var walker = walk(start);

      walker.on('directories', function (pathname, stats, next){
        var i = 0, j, isblack, name;

        while(i < stats.length){
          name = stats[i].name;
          console.log(name);
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
        var qstats = [],
          bodyStream;

        if (stat.mtime > lastUpdate) {
          console.log("a file is newer " + stat.name);
          stat.path = path.join(pathname, stat.name);
          stat.qmd5 = crypto.createHash("md5").update(stat.mtime.valueOf().toString() + stat.size + stat.path).digest("hex");
          scanResults.push(stat);
        }

        next();
      });

      walker.on('end', function(){
        console.log("End recursion. " + scanResults.length + " directories watched.");

        if (!scanResults.length) {
          return cb();
        }

        var statsMap = indexOn(scanResults, "qmd5");

        fs.writeFile(updateFile, JSON.stringify({
          lastUpdate: new Date().valueOf()
        }), function (err) {
          if (err) {
            throw err;
          }
          fs.writeFile('./db/scan/' + new Date().valueOf() + '.json', JSON.stringify(statsMap, null, '  '), function (err) {
            processScan();
          });
        });
 
        function processScan(err) {
          var allStats = scanResults.slice(),
            packet = 0,
            max_size = 1024 * 1024 * 2,
            stop,
            file,
            i,
            set;

          if (err) {
            throw err;
          }
          // TODO compare against last scan
          scanResults.sort(sortBySizeAndTime);
          for (i = 0; i < scanResults.length; i += 1) {
            file = scanResults[i];
            packet += file.size;
            if (packet >= max_size) {
              stop = i;
              break;
            }
          }

          set = scanResults.splice(0, i);

          filepush(options, set, function (response) {
            var chunks = [];
            response.on('data', function (chunk) {
              chunks.push(chunk.toString());
            });
            response.on('end', function () {
              // TODO stream parse JSON
              console.log(chunks);
              // XXX TODO BUG
              var data = JSON.parse('[' + chunks.join(',') + ']');
              data.forEach(function (item) {
                var orig = allStats[item.qmd5];
                if (!orig) {
                  console.log(new Error("got back results for a file that wasn't sent"));
                  return;
                }
                orig.md5 = item.md5;
                orig.saved = true;
                console.log("match: ", orig, item);
              });
              
            });
            cb(response)
          });
        }
      });
    }

    fs.readFile(updateFile, function (err, data) {
      if (err) {
        data = '{ "lastUpdate": -9999999999999999 }';
      }
      var date = new Date(JSON.parse(data).lastUpdate);
      console.log(date);
      addWatches(watchedDirs, date);
    });
  }

  module.exports = create;
}());
