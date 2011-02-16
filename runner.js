(function () {
  "use strict";

  var dirpush = require("./lib/dirpush");
  dirpush('./tests', function () {
    console.log("eagle landed hard core");
  });
}());
