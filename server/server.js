/*
 * Copyright 2011 T. Jameson Little, AJ ONeal
 * MIT Licensed
 */
var require;
(function () {
	"use strict";

	require('noop');
	require('futures/forEachAsync');

	var connect = require('connect'),
        authdb = require('./users'),
		form = require('connect-form'),
		fs = require('fs'),
		util = require('util'),
		routes = require('./lib/routes'),
		settings = require('./settings');

	// try to rename first, copy as a backup plan
	fs.move = function (oldPath, newPath, cb) {
		fs.rename(oldPath, newPath, function (err) {
			if (!err) {
				return doop(cb);
			}

			// backup plan
			var readStream = fs.createReadStream(oldPath),
				writeStream = fs.createWriteStream(newPath);

			util.pump(readStream, writeStream, function (err) {
				if (err) {
					return doop(cb, err);
				}
				fs.unlink(oldPath, cb);
			});
		});
	};

	function validateUserPassword(username, password, onSuccess, onFailure) {
		if (authdb[username] && authdb[username] === password) {
			if (onSuccess) {
				return onSuccess();
			} else {
				// using basicAuth
				return true;
			}
		}

		if (onFailure) {
			onFailure(new Error("Username and password don't pass"));
		}
		return false;
	}

	function routing(app) {
		// default to upload, may change in the future
		app.post("/", routes.post.upload);
		app.post("/file", routes.post.upload);
		app.post("/check", routes.post.check);
		app.post("/settings", function (req, res, next) {
			fs.writeFile('settings.json', JSON.stringify(req.body));

			res.writeHead(200, {'Content-Type': 'application/json'});
			res.end(JSON.stringify(settings));
		});

		app.get("/admin", routes.get.admin);
		// kinda works
		app.get("/file", routes.get.download);
		app.get("/meta/:field/:value?", routes.get.meta);
		app.get("/settings", function (req, res, next) {
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.end(JSON.stringify(settings));
		});

		// I don't care whether it's a post or a get request
		app.post("/register", routes.post.register);
		app.get("/register", routes.get.register);
	}

	connect(
		connect.basicAuth(validateUserPassword),
		form({keepExtensions: true}),
		connect.bodyParser(),
		connect.router(routing),
		connect.static("./")
	).listen(settings.port);

	console.log("Server listening on port " + settings.port);
}());
