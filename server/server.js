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
		settings = require('./settings'),
		os = require('os'),
		url = require('url'),
		qs = require('qs'),
		server;

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

	function calculateCPU(callback) {
		var cpus = os.cpus(),
			startTime = +new Date,
			tSum = [];

		cpus.forEach(function (item) {
			var tCPU = {
				'user': item.times.user,
				'nice': item.times.nice,
				'sys': item.times.sys,
				'idle': item.times.idle,
				'irq': item.times.irq
			};

			tSum.push(tCPU);
		});

		// timeout necessary to get difference in cpu usage
		setTimeout(function () {
			var endTime, elapsedTime;

			cpus = os.cpus();
			endTime = +new Date;

			elapsedTime = endTime - startTime;

			cpus.forEach(function (item, i) {
				tSum[i].user = (item.times.user - tSum[i].user) / elapsedTime;
				tSum[i].nice = (item.times.nice - tSum[i].nice) / elapsedTime;
				tSum[i].sys = (item.times.sys - tSum[i].sys) / elapsedTime;
				tSum[i].idle = (item.times.idle - tSum[i].idle) / elapsedTime;
				tSum[i].irq = (item.times.irq - tSum[i].irq) / elapsedTime;
			});

			callback(tSum);
		}, settings.cpu_timeout);
	}

	function routing(app) {
		// default to upload, may change in the future
		app.post("/", routes.post.upload);
		app.post("/file", routes.post.upload);
		app.post("/check", routes.post.check);
		app.post("/settings", function (req, res, next) {
			var restartServer = false;
			if (req.body.port !== settings.port || req.body.doc_root !== settings.doc_root) {
				restartServer = true;
			}
			
			settings = req.body;
			fs.writeFile('settings.json', JSON.stringify(settings));

			res.writeHead(200, {'Content-Type': 'application/json'});
			res.end(JSON.stringify(settings));

			if (restartServer) {
				server.close();
				initServer();
			}
		});

		app.get("/admin", routes.get.admin);
		// kinda works
		app.get("/file", routes.get.download);
		app.get("/meta/:field/:value?", routes.get.meta);
		app.get("/settings", function (req, res, next) {
			var tReturn = {},
				query = qs.parse(url.parse(req.url).query);

			function finish () {
				res.writeHead(200, {'Content-Type': 'application/json'});
				res.end(JSON.stringify(tReturn));
			};

			if (Object.keys(query).length > 0) {
				if (query.uptime) {
					tReturn.uptime = os.uptime();
				}
				if (query.ram) {
					tReturn.ram = {
						'free': os.freemem(),
						'total': os.totalmem()
					};
				}
				if (query.cpu) {
					calculateCPU(function (tSum) {
						tReturn.cpus = tSum;
						finish();
					});
				} else {
					finish();
				}
			} else {
				tReturn = settings;
				finish();
			}
		});

		// I don't care whether it's a post or a get request
		app.post("/register", routes.post.register);
		app.get("/register", routes.get.register);
	}

	function initServer () {
		server = connect(
			connect.basicAuth(validateUserPassword),
			form({keepExtensions: true}),
			connect.bodyParser(),
			connect.router(routing),
			connect.static(settings.doc_root)
		);
	
		server.listen(settings.port, function () {
			console.log("Server listening on port " + settings.port);
		});
	}

	initServer();
}());
