(function () {
  "use strict";

  var walk = require('walk'),
    walker = walk('/tmp');

  walker.on('directory', function (path, stat, next) {
    console.log(path + '/' + stat.name);
    next();
  });

  walker.on('files', function (path, stats, next) {
    console.log(path + '/');
    console.log(stats);
    next();
  });
}());
