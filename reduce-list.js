(function () {
  "use strict";

  var indexOn = require('./lib/index-on');

  // full scan - moves and deletes
  // vs
  // quick scan - creates, moves (and half-moves), and modifies
  var fs = require('fs');

  function deepCloneJson(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function removeIdentical(before, afterOrig) {
    var beforeArr = [],
      afterArr = [],
      after = deepCloneJson(afterOrig);

    Object.keys(before).forEach(function (key) {
      if (after[key]) {
        delete after[key];
      } else {
        beforeArr.push(before[key]);
      }
    });
    Object.keys(after).forEach(function (key) {
      afterArr.push(after[key]);
    });

    return {
      before: beforeArr,
      after: afterArr
    };
  }

  function discoverModified(beforeOrig, afterOrig) {
    var before = indexOn(beforeOrig, 'path'),
      after = indexOn(afterOrig, 'path'),
      modified = [],
      beforeArr = [],
      afterArr = [];

    Object.keys(before).forEach(function (key) {
      if (after[key]) {
        modified.push(after[key]);
        delete after[key];
        delete before[key];
      }
    });

    Object.keys(before).forEach(function (key) {
      beforeArr.push(before[key]);
    });
    Object.keys(after).forEach(function (key) {
      afterArr.push(after[key]);
    });

    return {
      before: beforeArr,
      after: afterArr,
      modified: modified
    };
  }


  // This is probably the order of activities for most users
  // no change
  // created
  // modified
  // duplicated
  // deleted

  fs.readFile("./db/scan/post-fixtures-setup.json", function (err, data) {
    var before = JSON.parse(data);
    fs.readFile("./db/scan/post-fixtures-modify.json", function (err, data) {
      var after = JSON.parse(data),
        during,
        modified;

      console.log('Before:');
      Object.keys(before).forEach(function (key) {
        console.log("\t" + before[key].path);
      });

      console.log('After:');
      Object.keys(after).forEach(function (key) {
        console.log("\t" + after[key].path);
      });

      // most files have not changed in any way
      // so it makes sense to remove them first
      during = removeIdentical(before, after);

      console.log('Unique qmd5 (Before):');
      during.before.forEach(function (item) {
        console.log("\t" + item.path);
      });

      console.log('Unique qmd5 (After):');
      during.after.forEach(function (item) {
        console.log("\t" + item.path);
      });

      console.log('\n');
      // the next biggest group is probably created
      modified = discoverModified(during.before, during.after);

      console.log('\nModified - Same path and (probably) mime, different qmd5:');
      modified.modified.forEach(function (item) {
        console.log("\t" + item.path);
      });

      console.log('\nDeleted or (moved and modified) - different path, different mtime + size:');
      // deleted or (moved and modified)
      modified.before.forEach(function (item) {
        console.log("\t" + item.path);
      });

      console.log('\nCreated or (moved and modified) or (duplicated):');
      // created or (moved and modified)
      modified.after.forEach(function (item) {
        console.log("\t" + item.path);
      });

      console.log('');
    });
  });
}());
