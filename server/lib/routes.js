(function () {
	"use strict";

	var dbaccess = require('./dbaccess'),
		compress = require('compressor'),
		Tar = require("tar-async"),
		url = require('url'),
		qs = require('qs');
	
	function checkStatus(req, res, next) {
		var bFirst = true;

		res.writeHead(200, {'Content-Type': 'application/json'});
		res.write('[');
		req.body.files.forEachAsync(function (next, item) {
			dbaccess.fileExists(item.filestat, item.filedata, req.remoteUser, function (result) {
				if (!bFirst) {
					res.write(',');
				}
				bFirst = false;

				res.write(JSON.stringify(result));
				next();
			});
		}).then(function () {
			res.end(']');
		});
	}

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

	function handleMeta(req, res, next) {
		var mimeType,
			user = req.remoteUser,
			category = req.params.field,
			type = req.params.value;

		if (!req.params.field) {
			return next();
		}

		// if they have supplied the full mimetype
		if (req.params.value) {
			mimeType = category + "/" + type;

			dbaccess.getByMimeType(user, mimeType, function (error, result) {
				res.writeHead(200, {'Content-Type': 'application/json'});
				if (error) {
					res.end(JSON.stringify(error));
				} else {
					res.end(JSON.stringify(result));
				}
			});
			return;
		}

		// they want a category
		dbaccess.getMimeCategories(user, category, function (error, result) {
			var bFirst = true;

			res.writeHead(200, {'Content-Type': 'application/json'});

			if (error) {
				res.end(JSON.stringify(error));
				return;
			}

			console.log(result);

			res.write('[');
			result.forEachAsync(function (next, item) {
				console.log(item);
				dbaccess.getByMimeType(user, item, function (error, result) {

					result.forEach(function (tDoc) {
						if (!bFirst) {
							res.write(',');
						}
						bFirst = false;
						
						res.write(JSON.stringify(tDoc));
					});

					next();
				});
			}).then(function () {
				res.end(']');
			});
		});
	}

	function handleRegister(req, res) {
		var qData;
		if (req.method === "GET") {
			qData = qs.parse(url.parse(req.url).query);
			dbaccess.registerUser(qData.name, qData.pass, qData.data, function (cess) {
				res.writeHead(200, {'Content-Type': 'application/json'});
				res.end(JSON.stringify(cess));
			});
		} else {
			dbaccess.registerUser(req.body.user, req.fields.pass, req.fields.data, function (err) {
				res.writeHead(200, {'Content-Type': 'application/json'});
				if (err) {
					res.end(JSON.stringify({error: err}));
				} else {
					res.end(JSON.stringify({success: true}));
				}
			});
		}
	}

	module.exports.check = checkStatus;
	module.exports.download = handleDownload;
	module.exports.meta = handleMeta;
	module.exports.register = handleRegister;
}());
