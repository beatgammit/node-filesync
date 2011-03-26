(function () {
	"use strict";

	var compress = require('compressor'),
		Tar = require("tar-async");

	function handleDownload(req, res, next) {
		var tape, gzip;
		req.params.files = [{path: "./lib/dbaccess.js"}, {path: "./lib/import.js"}];
		
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


		if (req.params.files) {
			res.writeHead(200, {'Content-Type': 'application/x-gzip'});

			req.params.files.forEachAsync(function (cb, item) {
				tape.append(item.path, function (err) {
					if (err) {
						console.log(err);
						throw err;
					}

					cb();
				});
			}).then(function () {
				tape.close();
			});
			return;
		} else if (req.params.path) {
			res.writeHead(200, {'Content-Type': 'application/x-gzip'});

			tape.append(req.params.path, function (err) {
				if (err) {
					console.log(err);
					throw err;
				}

				tape.close();
			});

			return;
		} else {
			return next();
		}
	}

	module.exports = handleDownload;
}());
