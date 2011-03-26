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
		routes = require('./lib/routes');

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
		app.post("/file", routes.post.pload);
		app.post("/check", routes.post.check);

		// kinda works
		app.get("/file", routes.get.download);
		app.get("/meta/:field/:value?", routes.get.meta);

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
	).listen(8022);

	console.log("Server listening on port 8022");
}());
