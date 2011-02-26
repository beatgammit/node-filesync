#!/usr/bin/env node
(function () {
  "use strict";

  require('noop');

  var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    //inotifypp = require('inotify-plusplus'),
    walk = require('walk'),
    filepush = require("./filepush"),
    scannerDb = require("./scanner-db");

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

    function addWatches(out, lastUpdate) {
      console.log(start);
      var walker = walk(start);

      walker.on('directories', function (pathname, stats, next) {
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

        if (fullscan || stat.mtime > lastUpdate) {
          console.log("a file is newer " + stat.name);
          stat.path = path.join(pathname, stat.name);
          out.push(stat);
        }

        next();
      });


      var max_packet_size = 1024 * 1024 * 2;
      walker.on('end', function() {
        console.log("End recursion. " + out.length + " directories watched.");

        if (!out.length) {
          return cb(null);
        }

        if (fullscan) {
          scannerDb.save(out);
        }

        fs.writeFile(updateFile, JSON.stringify({
          lastUpdate: new Date().valueOf()
        }), function (err) {
          if (err) {
            throw err;
          }

          out.sort(sortBySizeAndTime);

          function nextSet() {
            var packet = 0,
              stop = undefined,
              i,
              set;

            console.log('crazy loop ' + out.length);

            for (i = 0; i < out.length; i += 1) {
              file = out[i];
              packet += file.size;
              if (packet >= max_packet_size) {
                stop = i;
                break;
              }
            }

            set = out.splice(0, stop || 1); // shortens original array
            console.log(out.length);
            console.log('SET: ' + JSON.stringify(set));

            if (0 === set.length) {
              cb(null);
            }
            filepush(options, set, function (err, response) {
              cb(err, response);
              if (out.length) {
                nextSet();
              }
            });
          }
          nextSet();

        });
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
      addWatches(watchedDirs, date);
    });
  }

  module.exports = create;
}());
