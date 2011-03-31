(function () {
	"use strict";

	require('futures/forEachAsync');

	var compress = require('compressor'),
		Tar = require("tar-async"),
		utils = require('../utils');

	function getPathArray(files, callback) {
		var fileArray = [];

		if (!files) {
			return callback(fileArray);
		}

		files.forEachAsync(function (next, file) {
			var path = utils.hashToPath(file.md5);

			path.exists(path, function (exists) {
				if (exists) {
					fileArray.push(path);
				}

				next();
			});
		}).then(function () {
			callback(fileArray);
		});
	}

	function handleDownload(req, res, next) {
		var tape, gzip;

		gzip = new compress.GzipStream();
		gzip.setEncoding('binary');
		gzip.addListener('data', function (data) {
			res.write(data, 'binary');
		}).addListener('error', function (error) {
			console.log(error);
			throw error;
		}).addListener('end', function () {
			res.end();
		});

		tape = new Tar({
			consolidate: true,
			output: gzip
		});

		tape.on('data', function (data) {
			gzip.write(data);
		});
		tape.on('error', function (error) {
			console.log(error);
			throw error;
		});
		tape.on('end', function () {
			gzip.close();
		});

		getPathArray(req.params.files, function (files) {
			res.writeHead(200, {'Content-Type': 'application/x-gzip'});

			files.forEachAsync(function (cb, item) {
				tape.append(item, function (err) {
					if (err) {
						console.log(err);
						throw err;
					}

					cb();
				});
			}).then(function () {
				tape.close();
			});
		});
	}

	module.exports = handleDownload;
}());
