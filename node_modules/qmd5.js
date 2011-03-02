(function () {
  "use strict";

  var crypto = require('crypto');

  function qmd5(stat, cb) {
    ['mtime', 'size', 'path'].forEach(function (attr) {
      if (!stat[attr]) {
        cb(new Error("Missing " + attr));
      }
    });
    return crypto
      .createHash('md5')
      .update(stat.mtime.toString() + stat.size + stat.path)
      .digest("hex");
  }

  module.exports = qmd5;
}());
