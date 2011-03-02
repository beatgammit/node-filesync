(function () {
  "use strict";

  var fs = require('fs'),
    msgpack = require('msgpack');

  function writeJsonStream(filename, data) {
    var fstream = fs.createWriteStream(filename),
      i,
      item,
      len = 0,
      notEmpty = true,
      count = 0;

    function write1k() {
      var arr = [''];
      count += 1;
      console.log('wrote1k ' + count + ' ' + new Date().valueOf());
      ///*
      for (i = 0; i < 10000; i += 1) {
        //console.log('wrote ' + data.length);
        item = data.pop();
        //console.log(item);
        // assume no empty items
        if (undefined === item) {
          notEmpty = false;
          break;
        }
        arr.push(JSON.stringify(item));
      }
      //*/
      ///*
      //arr = data.splice(0,10000);
      //*/
      if (arr.length) {
        fstream.write(arr.join(','));
      }
    }

    fstream.write('[');
    fstream.on('drain', function () {
      console.log('drain');
      if (notEmpty) {
        write1k();
      } else {
        fstream.write(']');
        fstream.end();
      }
    });
/*
      item = data.pop();
      if (undefined === item) {
        notEmpty = false;
        break;
      }
      arr.push(JSON.stringify(item));
*/
    write1k();
  }

console.log('fill', new Date().valueOf());
  var i, data = [];
  for (i = 0; i < 700000; i += 1) {
    data.push({
      "dev": i,
      "ino": 2535386,
      "mode": 33152,
      "nlink": 1,
      "uid": 504,
      "gid": 20,
      "rdev": 0,
      "size": 23234,
      "blksize": 4096,
      "blocks": 48,
      "atime": "2011-02-24T20:04:09.000Z",
      "mtime": "2011-02-24T20:04:09.000Z",
      "ctime": "2011-02-24T20:04:09.000Z",
      "name": ".viminfo",
      "type": "file",
      "path": "/Users/coolaj86/.viminfo",
      "qmd5": "2b37f89282481bd1b07b7f4c018384c5"
    });
  }
console.log('full', new Date().valueOf());
data.sort(function (a, b) {
  if (a.dev < b.dev) {
    return 1;
  }
  if (a.dev === b.dev) {
    return 0;
  }
  if (a.dev > b.dev) {
    return -1;
  }
});
console.log('sorted', new Date().valueOf());
//fs.writeFile('test-json2.json', JSON.stringify(data));
fs.writeFile('test-json2.msgpack', msgpack.pack(data));

console.log('JSON.stringified');
  //console.log(data);
  //writeJsonStream('test-write.json', data);
  module.exports = writeJsonStream;
}());
