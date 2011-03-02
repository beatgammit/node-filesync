(function () {
  "use strict";

  var directive = {
    tables: [
      {
        name: "filequeue",
        key: {
          name: 'id',
          type: 'integer',
        },
        columns: [
          {
            name: "qmd5",
            type: "char",
            size: "32",
            notnull: true,
            unique: true
          },
          {
            name: "rpath",
            type: "text",
            notnull: true
          },
          {
            name: "basename",
            type: "varchar",
            notnull: true
          },
          {
            name: "ext",
            type: "varchar",
            default: ""
          },
          {
            name: "mtime",
            type: "integer",
            notnull: true
          },
          {
            name: "size",
            type: "integer",
            notnull: true
          },
          {
            name: "type",
            type: "varchar"
          },
          {
            name: "tmd5",
            type: "char",
            size: 32
          },
          {
            name: "md5",
            type: "char",
            size: 32
          },
          {
            name: "previous_revision",
            type: "char",
            size: 32
          },
          {
            name: "update_count",
            type: "integer"
          },
          {
            name: "updated_on",
            type: "integer"
          },
          {
            name: "deleted",
            type: "boolean"
          },
          {
            name: "uploaded",
            type: "boolean",
            default: 0
          }
        ],
        // CREATE [UNIQUE] INDEX [IF NOT EXISTS] [DBNAME.] <index-name> ON 
        //   <table-name> ( <column-name>[,] [COLLATE BINARY|NOCASE|RTRIM] [ASC|DESC] );
        //
        // http://www.sqlite.org/lang_createindex.html
        indexes: [
          {
            columns: ["qmd5"],
            unique: true,
            name: "qmd5_index"
          },
          {
            columns: ["mtime","size"],
            name: "size_mtime_index"
          },
          {
            columns: ["rpath"],
            name: "path_index"
          }
        ],
        constraints: [
        ]
      }
    ]
  };

  module.exports = directive;

/*
    //"dev": 234881026,
    //"ino": 2465719,
    "mode": 33204,
    //"nlink": 1,
    //"uid": 504,
    //"gid": 20,
    //"rdev": 0,
    "size": 334,
    //"blksize": 4096,
    //"blocks": 8,
    //"atime": "2011-02-23T04:33:12.000Z",
    "mtime": "2011-02-21T18:27:46.000Z",
    //"ctime": "2011-02-21T18:27:46.000Z",
    "name": "walk.js",
    //"type": "file",
    "path": "tests/walk.js",
    "qmd5": "7ebec5c45d407d74a2ef831a6f1e63ae"
*/

}());
