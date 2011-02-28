(function () {
  "use strict";

  require('noop');
  require('remedial');


  function sqliteQuoteKeyword(str) {
    return "`" + String(str) + "`";
  }
  function sqliteEscape(str) {
    return str.replace("'","''");
  }
  function sqliteQuoteValue(str) {
    return "'" + String(str).replace("'", "''") + "'";
  }

  function createSqliteColumn(column, cb) {
    // TODO constraints
    column.type = (column.type || "text").toUpperCase();
    column.unique = (true === column.unique) ? "UNIQUE" : "";
    column.notnull = (true === column.notnull) ? "NOT NULL" : "";
    cb(" {name} {type} {notnull} {unique}".supplant(column));
  }

  // CREATE [UNIQUE] INDEX [IF NOT EXISTS] [DBNAME.] <index-name> ON 
  //   <table-name> ( <column-name>[,] [COLLATE BINARY|NOCASE|RTRIM] [ASC|DESC] );
  function createSqliteIndex(tablename, index) {
    var myindex = {},
      columns = [];

    myindex.unique = (true === index.unique) ? 'UNIQUE' : '';
    myindex.index = index.name || tablename + '_' + sqliteEscape(index.columns.join('_'));
    myindex.table = tablename;

    index.columns.forEach(function (item, i, arr) {
      columns.push(sqliteQuoteValue(item));
    });

    myindex.columns = columns.join(', ');
    return "CREATE {unique} INDEX IF NOT EXISTS {index} ON {table} ( {columns} );".supplant(myindex);
  }

  function createSqliteTable(table, cb) {
    var sql = "CREATE TABLE IF NOT EXISTS {name}".supplant(table),
      columns = [],
      tableName = table.name,
      tableColumns = table.columns,
      key = table.key;

    sql += " (\n  "

    key = key || {};
    key.name = (key.name || 'id').toLowerCase();
    key.type = (key.type || 'integer').toUpperCase();
    key.options = 'PRIMARY KEY';

    sql += " {name} {type} {options} ".supplant(key);

    // XXX if when using real async
    tableColumns.forEach(function (column) {
      createSqliteColumn(column, function (sql) {
        columns.push(sql);
      });
    });
    if (columns.length) {
      sql += ',\n  ' + columns.join(',\n  ') + '\n);\n';
    }

    (table.indexes||[]).forEach(function (index) {
      sql += createSqliteIndex(table.name, index) + '\n';
    });

    cb(null, sql);
  }

  // TODO associate with table
  function insert_one(tablename, obj, ins_opts) {
    insert_many(tablename, [obj], ins_opts);
  }

  function insert_many(table, objects, ins_opts) {
    var sql = "BEGIN TRANSACTION;",
      statements = [],
      resolve = ('ignore' === (ins_opts||{}).resolve) ? 'OR IGNORE' : '';

    objects.forEach(function (obj) {
      var values = ['null'],
        ins;

      table.columns.forEach(function (column) {
        var value = obj[column.name]; // XXX cases must match
        if ('undefined' === typeof value || 'null' === typeof value) {
          value = 'null';
        }
        if ('null' !== value) {
          value = sqliteQuoteValue(String(value));
        }
        values.push(value);
      });

      ins = "INSERT {resolve} INTO {table} VALUES ( {values} );".supplant({
        resolve: resolve,
        table: table.name,
        values: values.join(', ')
      });
      statements.push(ins);
    });

    sql += "\n  " + statements.join('\n  ') + "\nCOMMIT;";
    return sql;
  }

  function update_many(table, objects, up_opts) {
    var sql = "BEGIN TRANSACTION;",
      statements = [],
      excludes = {},
      key = up_opts.key || 'id',
      resolve = ('ignore' === (up_opts||{}).resolve) ? 'OR IGNORE' : '';

    up_opts = up_opts || {};

    excludes[key] = true;
    (up_opts.excludes||[]).forEach(function (_key) {
      excludes[_key] = true;
    });

    objects.forEach(function (obj) {
      var values = [],
        ins;

      table.columns.forEach(function (column) {
        var name = sqliteQuoteKeyword(column.name),
          value = obj[column.name]; // XXX cases must match

        if (excludes[column.name]) {
          return;
        }

        if ('undefined' === typeof value) {
          return;
        }
        if ('null' === typeof value) {
          value = 'null';
        } else {
          value = sqliteQuoteValue(String(value));
        }

        values.push(name + " = " + value);
      });

      ins = "UPDATE {resolve} {table} SET {value_pairs} \n  WHERE {key} = {value};\n"
      .supplant({
        resolve: resolve,
        table: table.name,
        value_pairs: '\n    ' + values.join(',\n    '),
        key: sqliteQuoteKeyword(key),
        value: sqliteQuoteValue(obj[key])
      });
      statements.push(ins);
    });

    sql += "\n  " + statements.join('\n ') + "\nCOMMIT;";
    return sql;
  }

  module.exports = {
    table: createSqliteTable,
    insert_one: insert_one,
    insert_many: insert_many,
    update_many: update_many
  };

}());
