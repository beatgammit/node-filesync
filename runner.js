(function () {
  "use strict";

  var dirpush = require("./lib/dirpush");
  dirpush('./tests', { host: '192.168.1.101', port: 8022 }, function () {
    console.log("eagle landed hard core");
  });
}());
