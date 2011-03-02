(function () {
  "use strict";

  require('noop');

  var scannerDb = require('../lib/scanner-db'),
    scan = [
      {
        "qmd5": "abcdef0123456789abcdef0123456789",
        "path": "./test/file1.txt",
        "contentType": "text/plain",
        "name": "file1.txt",
        "size": "13",
        "mtime": "1234456789"
      },
      {
        "qmd5": "0123456789abcdefabcdef0123456789",
        "path": "./test/file2.txt",
        "contentType": "text/plain",
        "name": "file1.txt",
        "size": "15",
        "mtime": "1284456789"
      }
    ];

  scannerDb.load(function (err, data) {
    console.log(data);
  });

  scannerDb.save(scan, function (err) {
    throwop(err);
    console.log("Saved");
  });
}());      
