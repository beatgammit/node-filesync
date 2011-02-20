(function (){
	require('futures/forEachAsync');

	var fs = require('fs'),
		crypto = require('crypto'),
		path = require('path'),
		exec = require('child_process').exec,
		couchdb = require('couchdb-tmp'),
		client = couchdb.createClient(5984, '192.168.1.100'),
		filesyncdb = client.db('filesync'),
		FileStat = require('./filestat.js'),
		hashAlgo = "md5",
		regex = /(..)(..)(..)(..).*/,
		doc_root = "./media/";

	function saveToDb(key, value){
		var docData = {
			'key': key,
			'value': value
		};
		filesyncdb.getDoc(key, function(err, doc){
			if(doc){
				docData = doc;
				doc['value'] = value;
			}

			filesyncdb.saveDoc(key, docData, function(err, ok){
				if(err){
					console.log("DBError: " + JSON.stringify(err));
				}else{
					//console.log("Key: " + key);
					//console.log("Value: " + JSON.stringify(value));
				}
			});
		});
	}

	function readFile(filePath, callback){
		var readStream,
			hash = crypto.createHash(hashAlgo);

		readStream = fs.createReadStream(filePath);

		readStream.on('data', function(data){
			hash.update(data);
		});

		readStream.on('error', function(err){
			console.log("Read Error: " + err.toString());
			readStream.destroy();
			fs.unlink(filePath);
			callback(err);
		});

		readStream.on('end', function(){
			callback(null, hash.digest("hex"));
		});
	}

	function saveToFs(fileStat, filePath, callback){
		var m, newPath;

		m = fileStat.md5.match(regex);
		newPath = path.join(doc_root, m[1], m[2], m[3], m[4]);

		path.exists(newPath, function(exists){
			fileStat.originalPath = fileStat.path;
			fileStat.path = path.join(newPath, m[0]);

			if(exists){
				fs.move(filePath, fileStat.path, function (err) {
					callback(err, fileStat);
				});
				return;
			}

			exec('mkdir -p ' + newPath, function(err, stdout, stderr){
				if(err || stderr) {
					console.log("Err: " + (err ? err : "none"));
					console.log("stderr: " + (stderr ? stderr : "none"));
					return callback(err, fileStat, stderr);
				}

				console.log("stdout: " + (stdout ? stdout : "none"));
				fs.move(filePath, fileStat.path, function (err) {
					callback(err, fileStat, stderr);
				});
			});
		});
	}

	function addKeysToFileStats(fieldNames, stats){
		var fileStats = [];

		stats.forEach(function(item) {
			fileStat = FileStat();

			item.forEach(function(fieldValue, i) {
				fileStat[fieldNames[i]] = fieldValue;
			});

			fileStats.push(fileStat);
		});

		return fileStats;
	}

	function importFile(fileStat, tmpFile, callback){
		var oldPath;

		oldPath = tmpFile.path;
		readFile(oldPath, function(err, md5){
			if (err) {
				fileStat.err = err;
				callback(err, fileStat);
				return;
			}

			// if we have an md5sum and they don't match, abandon ship
			if(fileStat.md5 && fileStat.md5 !== md5){
				callback(false);
				return;
			}

			fileStat.md5 = md5;

			saveToFs(fileStat, oldPath, function(err){
				if (err) {
					fs.unlink(oldPath); // XXX ignoring possible unlink error
					fileStat.err = "File did not save";
				} else {
					saveToDb(fileStat.qmd5, fileStat);
				}
				callback(err, fileStat);
			});
		});
	}

	function handleUpload(req, res, next){
		if(!req.form){
			return next();
		}

		req.form.complete(function(err, fields, files){
			var fileStats;

			fields.statsHeader = JSON.parse(fields.statsHeader);
			fields.stats = JSON.parse(fields.stats);

			fileStats = addKeysToFileStats(fields.statsHeader, fields.stats);

			res.writeHead(200, {'Content-Type': 'application/json'});

			function handleFileStat(next, fileStat) {
				// this callback is synchronous
				fileStat.checksum(function (isEqual, qmd5) {
					function finishReq(err) {
						console.log("Upload succeeded:");
						console.log(fileStat);
						fileStat.err = err;
						res.write(JSON.stringify(fileStat));
						next();
					}

					if (!isEqual) {
						return finishReq("Sum not equal");
					}
					importFile(fileStat, files[qmd5], finishReq);
				});
			}

			fileStats.forEachAsync(handleFileStat).then(function(){
				console.log("Send stuff");
				res.end();
			});
		});
	}

	module.exports = handleUpload;
})();
