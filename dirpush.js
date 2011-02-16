#!/usr/bin/env node
(function () {
  "use strict";

  var http = require('http'),
    ahr = require('ahr'),
    File = require('file-api').File,
    FormData = require('file-api').FormData,
    fs = require('fs'),
    crypto = require('crypto'),
    path = require('path'),
    //inotifypp = require('inotify-plusplus'),
    walk = require('walk'),
    filepush = require("./lib/filepush.js"),
    updateFile = './lastupdate.json';



  //var inotifypp = inotify.create(true);

  var watchedDirs = new Array();
  var blacklist = [/cache/i];

  var directive = {
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

  function addWatches(out, start, lastUpdate){
    console.log(start);
    var walker = walk(start);

    walker.on('directories', function (path, stats, next){
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
          //inotifypp.watch(directive, path + name);
          i += 1;
        }
      }

      next();
    });


    walker.on('file', function (path, stat, next) {
      var formData = new FormData(),
        qstats = [],
        bodyStream;

      if (stat.mtime > lastUpdate) {
        console.log("a file is newer " + stat.name);
        stat.path = path;
        out.push(stat);
      }

      next();
    });

    walker.on('end', function(){
      console.log("End recursion. " + out.length + " directories watched.");
      out.forEach(function (file) {
        console.log(file);
        // filepush(process.argv[2] || 'www.beatgammit.com', process.argv[3] || 8022, [stat], next);
      });

      fs.writeFile(updateFile, JSON.stringify({
        lastUpdate: new Date().valueOf()
      }));
    });
  }

  fs.readFile(updateFile, function (err, data) {
    var date = new Date(JSON.parse(data).lastUpdate);
    console.log(date);
    addWatches(watchedDirs, process.argv[2] || './tests', date);
  });
}());
