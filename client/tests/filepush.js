(function () {
  "use strict";

  var filepush = require("../lib/filepush.js"),
    fs = require('fs'),
    path = __dirname + "/rootdir/file5.txt";

  fs.stat(path, function (err, stat) {
    stat.path = path;
    filepush(process.argv[2] || 'www.beatgammit.com', process.argv[3] || 8022, [stat], function () {
      console.log("The Eagle has Landed!");
    });
  });

}());
