(function () {
  "use strict";

  require('noop');
  require('remedial');

  function sqliteEscape(str) {
    return str.replace("'","''");
  }
  function sqliteQuoteValue(str) {
    return "'" + String(str).replace("'", "''") + "'";
  }

  function createSqliteColumn(column, cb) {
    // TODO constraints
    column.type = (column.type || "text").toUpperCase();
    column.notnull = (true === column.notnull) ? "NOT NULL" : "";
    cb(" {name} {type} {notnull}".supplant(column));
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

    sql += " (\n\t"

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
      sql += ',\n\t' + columns.join(',\n\t') + '\n);\n';
    }

    (table.indexes||[]).forEach(function (index) {
      sql += createSqliteIndex(table.name, index) + '\n';
    });

    cb(null, sql);
  }

  // TODO associate with table
  function insert_value(tablename, obj) {
    directive.tables.forEach(function (table) {
      if (tablename === table.name) {
        columns = table.columns;
      }
    });
    columns.forEach(function (column) {
      values.push(obj[column.name]);
    });
  }

  function insert_values(table, objects) {
    var sql = "BEGIN TRANSACTION;",
      statements = [];

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

      ins = "INSERT INTO {table} VALUES ( {values} );".supplant({ table: table.name, values: values.join(', ')})
      statements.push(ins);
    });

    sql += "\n\t" + statements.join('\n\t') + "\nCOMMIT;";
    return sql;
  }

  module.exports = {
    table: createSqliteTable,
    insert: insert_value,
    insert_many: insert_values
  };

}());
