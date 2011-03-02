(function () {
  "use strict";

  var path = require('path');

  module.exports = {
    dbpath: path.join(__dirname, '../db/filesync.sqlite3')
  };
}());
