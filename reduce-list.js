(function () {
  "use strict";

  // full scan - moves and deletes
  // vs
  // quick scan - creates, moves (and half-moves), and modifies
  var fs = require('fs');

  fs.readFile("./db/scan/post-fixtures-setup.json", function (err, data) {
    var first = JSON.parse(data);
    fs.readFile("./db/scan/post-fixtures-modify.json", function (err, data) {
      var second = JSON.parse(data);
      console.log(first);
      console.log(second);
    });
  });
}());
