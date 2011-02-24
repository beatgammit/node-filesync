  // Take a normalized array of objects and
  // produce an indexed map on a particular key
module.exports = function indexOn(arr, key) {
    var map = {};
    arr.forEach(function (obj) {
      map[obj[key]] = obj;
    });
    return map;
  }
