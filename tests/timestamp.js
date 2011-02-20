(function () {
  "use strict";

  // test to see if a date object will be parsed back into a date object once stringified

  // seconds seems to be the only reliable method
  // both toISOString and toString return non-parsable dates

  var fs = require('fs');

  fs.writeFile('./lastupdate.json', JSON.stringify({
    lastUpdate: (new Date().valueOf())
  }), function () {
    fs.readFile('./lastupdate.json', function (err, data) {
      data = JSON.parse(data);
      console.log(new Date(data.lastUpdate));
    });
  });

}());
