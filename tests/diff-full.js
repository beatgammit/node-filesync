(function () {
  "use strict";

  // TODO
  // how does git handle these forks?
  // can we emulate it with as low of a cost?
  // perhaps Chris can look into this - he seems to be interested in this sort of thing

  var fs = require('fs'),
    diffFull = require('../lib/diff-full');

  fs.readFile("../db/scan/post-fixtures-setup.json", function (err, data) {
    var before = JSON.parse(data);
    fs.readFile("../db/scan/post-fixtures-modify.json", function (err, data) {
      var after = JSON.parse(data),
        changes = diffFull(before, after);

      // Modified - Same path and (probably) mime, different qmd5
      console.log('\nModified (path or size + mtime stayed the same): ');
      changes.modified.forEach(function (item) {
        console.log("\t" + item.path);
      });
      //console.log(changes.modified);


      // Deleted means that the file existed in the previous scan
      // but did not exist in this scan by qmd5, path, or (size + time + mime)
      // deleted or (moved and modified) - different path, different mtime + size
      console.log('\nDeleted or (moved and modified): ');
      changes.deleted.forEach(function (item) {
        console.log("\t" + item.path);
      });
      //console.log(changes.deleted);

      // created or (moved and modified)
      console.log('\nCreated or (moved and modified) or (duplicated):');
      changes.created.forEach(function (item) {
        console.log("\t" + item.path);
      });
      //console.log(changes.created);
    });
  });
}());
