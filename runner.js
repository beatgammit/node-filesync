(function () {
  "use strict";

  var dirpush = require("./lib/dirpush");
  dirpush('./tests', { 
    //host: '192.168.1.101', 
    host: 'localhost', 
    port: 8022,
    user: 'coolaj86',
    password: 'cr4zym0nk3y'
  }, function (response) {
    response.on('data', function (data) {
      console.log("DATA");
      console.log(data.toString());
    });
    response.on('end', function () {
      console.log("END: eagle landed hard core");
    });
  });
}());
