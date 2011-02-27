        function writeRaw() {
          console.log('writeRaw');
          fs.writeFile('./db/scan/raw-' + new Date().valueOf() + '.json', JSON.stringify(scanResults, null, '  '), function (err) {
            console.log('wroteRaw');
            lastUpdate: new Date().valueOf()
          }, function (err) {
            if (err) {
              throw err;
            }
            writeIndexed();
          });
        }

        function writeIndexed() {
          var statsMap = indexOn(scanResults, "qmd5");
          fs.writeFile(updateFile, JSON.stringify({
            lastUpdate: new Date().valueOf()
          }), function (err) {
            if (err) {
              throw err;
            }
            fs.writeFile('./db/scan/' + new Date().valueOf() + '.json', JSON.stringify(statsMap, null, '  '), function (err) {
              processScan();
            });
          });
        }
