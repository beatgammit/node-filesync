/*
 * Copyright 2011 T. Jameson Little, AJ ONeal
 * MIT Licensed
 */
var require;
(function () {
	"use strict";

	require('noop');
	require('long-stack-traces');

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

	function handleMeta(req, res, next){
		var urlObj, query, dbaccess = require('./lib/dbaccess'), mimeType;

		switch(req.params.field){
			case "type":{
				if(req.params.value && req.params.ext){
					mimeType = req.params.value + "/" + req.params.ext;
					dbaccess.getByMimeType(mimeType, function(err, docArray){
						console.log(JSON.stringify(docArray));
						res.writeHead(200, {'Content-Type': 'application/json'});
						res.end(JSON.stringify(docArray));
					});
				}else{
					res.writeHead(200, {'Content-Type': 'application/json'});
					res.end("{err: 'Not implemented, sorry'}");
				}
				break;
			}
			default:{
				res.writeHead(200, {'Content-Type': 'application/json'});
				res.end("{err: 'Not implemented, sorry'}");
				break;
			}
		}
	}

	function routing(app){
		app.post("/", function(req, res, next){
			handleUpload(req, res, next);
		});
		app.post("/file", handleUpload);
		// doesn't work yet
		//app.get("/file", handleDownload);
		app.get("/meta/:field/:value?/:ext", handleMeta);
	}

	server = connect.createServer(
		auth([ auth.Http({ validatePassword: validateUserPassword }) ]),
		form({keepExtensions: true}),
		connect.router(routing),
		staticProvider()
	);

	server.listen(8022);

	console.log("Server listening on port 8022");
}());
