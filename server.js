/*
 * Copyright 2011 T. Jameson Little, AJ ONeal
 * MIT Licensed
 */
var require;
(function () {
	"use strict";

	require('noop');

	var connect = require('connect'),
        auth = require('connect-auth'),
        authdb = require('./users'),
		staticProvider = require("./static"),
		form = require('connect-form'),
		fs = require('fs'),
		url = require('url'),
		qs = require('qs'),
		util = require('util'),
		handleUpload = require("./lib/import.js"),
		server;

	// try to rename first, copy as a backup plan
	fs.move = function (oldPath, newPath, cb) {
		fs.rename(oldPath, newPath, function(err){
			if (!err) {
				return doop(cb);
			}

			// backup plan
			//console.log("Move Error: " + err);
			var readStream = fs.createReadStream(oldPath),
				writeStream = fs.createWriteStream(newPath);

			util.pump(readStream, writeStream, function(err) {
				if (err) {
					return doop(cb, err);
				}
				fs.unlink(oldPath, cb);
			});
		});
	};

	function validateUserPassword(username, password, onSuccess, onFailure) {
		console.log("UName");
		if (authdb[username] && authdb[username] === password) {
			return onSuccess();
		}
		onFailure(new Error("Username and password don't pass"));
	}

	function authenticateUser(req, res, next) {
		console.log("Pre-Auth");
		req.authenticate(['http'], function(error, authenticated) { 
			console.log("Auth");
			if (authenticated) {
				return next();
			}
			res.writeHead(403, {'Content-Type': 'text/html'});
			res.end("<html><h1>Bad Authentication</h1></html>\n");
			return;
		});
	}

	function handleMeta(req, res, next){
		var urlObj, query, dbaccess = require('./lib/dbaccess');
		
		urlObj = url.parse(req.url);
		query = qs.parse(urlObj.query);

		if(query.contentType){
			dbaccess.getByMimeType(query.contentType, function(err, docArray){
				console.log(JSON.stringify(docArray));
				res.writeHead(200, {'Content-Type': 'application/json'});
				res.end(JSON.stringify(docArray));
			});
		}else{
			res.writeHead(404, {'Content-Type': 'application/json'});
			res.end(JSON.stringify({error: "Nothing to do", query: query}));
		}
	}

	function routing(app){
		app.post("/", function(req, res, next){
			console.log("Hi");
			handleUpload(req, res, next);
		});
		app.post("/file", handleUpload);
		// doesn't work yet
		//app.get("/file", handleDownload);
		app.get("/meta", handleMeta);
	}

	server = connect.createServer(
		auth([ auth.Http({ validatePassword: validateUserPassword }) ]),
		authenticateUser,
		form({keepExtensions: true}),
		connect.router(routing),
		staticProvider()
	);

	server.listen(8022);

	console.log("Server listening on port 8022");
}());
