(function () {
  "use strict";

  /*
  BEGIN TRANSACTION;
    UPDATE  filequeue SET `rpath` = '######', `mtime` = '11' WHERE `qmd5` = '85d58e9ada65157af2971fe8d8d1c1dc';
  COMMIT;
  */

  var sqlitize3 = require('../lib/sqlitize3'),
    directive = require('../lib/sql-directive'),
    objects = [{
      qmd5: '85d58e9ada65157af2971fe8d8d1c1dc',
      doesnt: 'exist',
      size: undefined,
      mtime: 11,
      rpath: "######"
    }],
    s = sqlitize3.update_many(directive.tables[0], objects, {key: 'qmd5'});

  console.log(s);
}());
