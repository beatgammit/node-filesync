(function () {
  "use strict";

  var indexOn = require('./index-on');

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

  function sortChanges(beforeOrig, afterOrig) {
    var before = indexOn(beforeOrig, 'path'),
      after = indexOn(afterOrig, 'path'),
      modified = [],
      deleted = [],
      created = [];

    // Find files with common path
    Object.keys(before).forEach(function (key) {
      if (after[key]) {
        modified.push(after[key]);
        delete after[key];
        delete before[key];
      }
    });

    // Deleted
    Object.keys(before).forEach(function (key) {
      deleted.push(before[key]);
    });

    // Created
    Object.keys(after).forEach(function (key) {
      created.push(after[key]);
    });

    return {
      deleted: deleted,
      created: created,
      modified: modified
    };
  }

  // Avoid uploading duplicate files
  // don't slow down the user's computer 
  // Consider: The folder Amazon/Music is duplicated to iTunes/Music, etc
  function discoverDuplicates(after) {
    // size
    // tmd5
  }


  // This is probably the order of activities for most users
  // no change
  // created
  // modified
  // duplicated
  // deleted
  function diffFullAgainstPrevious(before, after) {
    var during, changes;

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
    changes = sortChanges(during.before, during.after);

    return {
      deleted: changes.deleted,
      modified: changes.modified,
      created: changes.created
    };
  }

  module.exports = diffFullAgainstPrevious;
}());
