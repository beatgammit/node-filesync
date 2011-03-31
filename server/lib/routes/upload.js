(function () {
	"use strict";

	require('futures/forEachAsync');

	var fs = require('fs'),
		crypto = require('crypto'),
		path = require('path'),
		exec = require('child_process').exec,
		mime = require('mime'),
		FileStat = require('filestat'),
		dbaccess = require('../dbaccess'),
		utils = require('../utils'),
		hashAlgo = "md5";

	function readFile(filePath, callback) {
		var readStream, hash = crypto.createHash(hashAlgo);

		readStream = fs.createReadStream(filePath);

		readStream.on('data', function (data) {
			hash.update(data);
		});

		readStream.on('error', function (err) {
			console.log("Read Error: " + err.toString());
			readStream.destroy();
			fs.unlink(filePath);
			callback(err);
		});

		readStream.on('end', function () {
			callback(null, hash.digest("hex"));
		});
	}

	function saveToFs(md5, filePath, callback) {
		var newPath = utils.hashToPath(md5);

		path.exists(newPath, function (exists) {
			if (exists) {
				fs.move(filePath, newPath, function (err) {
					callback(err, newPath);
				});
				return;
			}

			exec('mkdir -p ' + newPath, function (err, stdout, stderr) {
				var tError;
				if (err || stderr) {
					console.log("Err: " + (err ? err : "none"));
					console.log("stderr: " + (stderr ? stderr : "none"));
					tError = {error: err, stderr: stderr, stdout: stdout};
					return callback(tError, newPath);
				}

				console.log("stdout: " + (stdout ? stdout : "none"));
				fs.move(filePath, newPath, function (moveErr) {
					callback(moveErr, newPath);
				});
			});
		});
	}

	function addKeysToFileStats(fieldNames, stats) {
		var fileStats = [];

		stats.forEach(function (item) {
			var fileStat = new FileStat();

			item.forEach(function (fieldValue, i) {
				fileStat[fieldNames[i]] = fieldValue;
			});

			if (fileStat.path) {
				fileStat.type = mime.lookup(fileStat.path);
			}

			fileStats.push(fileStat);
		});


		return fileStats;
	}

	function importFile(fileStat, tmpFile, username, callback) {
		var oldPath;

		oldPath = tmpFile.path;
		readFile(oldPath, function (err, md5) {
			if (err) {
				fileStat.err = err;
				callback(err, fileStat);
				return;
			}

			// if we have an md5sum and they don't match, abandon ship
			if (fileStat.md5 && fileStat.md5 !== md5) {
				callback("MD5 sums don't match");
				return;
			}

			fileStat.md5 = md5;

			fileStat.genTmd5(function (error, tmd5) {
				if (!error) {
					fileStat.tmd5 = tmd5;
			
					saveToFs(fileStat.md5, oldPath, function (fserr) {
						if (fserr) {
							// ignoring possible unlink error
							fs.unlink(oldPath);
							fileStat.err = "File did not save";
						} else {
							dbaccess.put(fileStat, username);
						}
						callback(fserr, fileStat);
					});
				}
			});
		});
	}

	function handleUpload(req, res, next) {
		if (!req.form) {
			return next();
		}

		req.form.complete(function (err, fields, files) {
			var fileStats, bFirst;

			fields.statsHeader = JSON.parse(fields.statsHeader);
			fields.stats = JSON.parse(fields.stats);

			fileStats = addKeysToFileStats(fields.statsHeader, fields.stats);
			dbaccess.createViews(req.remoteUser, fileStats);

			res.writeHead(200, {'Content-Type': 'application/json'});
			
			// response as array
			res.write("[");

			bFirst = true;
			function handleFileStat(next, fileStat) {
				// this callback is synchronous
				fileStat.checkMd5(function (qmd5Error, qmd5) {
					function finishReq(err) {
						console.log(fileStat);
						fileStat.err = err;

						// we only want to add a comma after the first one
						if (!bFirst) {
							res.write(",");
						}
						bFirst = false;

						res.write(JSON.stringify(fileStat));
						return next();
					}

					if (qmd5Error) {
						return finishReq(qmd5Error);
					}
					importFile(fileStat, files[qmd5], req.remoteUser, finishReq);
				});
			}

			fileStats.forEachAsync(handleFileStat).then(function () {
				// end response array
				res.end("]");
			});
		});
	}

	module.exports = handleUpload;
}());
