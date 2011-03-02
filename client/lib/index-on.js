  // Take a normalized array of objects and
  // produce an indexed map on a particular key
module.exports = function indexOn(arr, key) {
    var map = {};
    arr.forEach(function (obj) {
      map[obj[key]] = obj;
    });
    return map;
  }

/*
  Idea: Index On multiple Keys

  addIndex(collection, key)

  removeFromAllIndexes(item);
  function removeFromAll(item) {
    item._index_keys.forEach(function (keyname) {
      var key = item[keyname];

      item._indexes[keyname][key] = undefined;
      delete item._indexes[keyname][key];
    });
  });
*/
