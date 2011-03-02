/*
 * Copyright 2011 T. Jameson Little, AJ ONeal
 * MIT Licensed
 */
var require;
(function () {
	"use strict";

	require('noop');
	require('long-stack-traces');
	require('futures/forEachAsync');

	var connect = require('connect'),
        auth = require('connect-auth'),
		db = require('./lib/dbaccess'),
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

	function handleRegister(req, res){
		console.log(req.url);
		var qData;
		if(req.method == "GET"){
			qData = qs.parse(url.parse(req.url).query);
			db.registerUser(qData.name, qData.pass, qData.data, function(cess){
				res.writeHead(200, {'Content-Type': 'application/json'});
				res.end(JSON.stringify(cess));
			});
		}else if(req.form){
			req.form.complete(function(err, fields){
				console.log();
				console.log();
				console.log();
				console.log();
				console.log(JSON.stringify(fields));
				console.log();
				console.log();
				console.log();
				console.log();

				res.writeHead(200, {'Content-Type': 'application/json'});
				if(err){
					res.end(JSON.stringify(err));
					return;
				}

				db.registerUser(fields.user, fields.pass, fields.data, function(success){
					res.end(JSON.stringify(success));
				});
			});
		}
	}

	function checkStatus(req, res, next){
		var bFirst = true;

		req.body = JSON.parse(req.body);

		res.writeHead(200, {'Content-Type': 'application/json'});
		res.write('[');
		req.body.files.forEachAsync(function(next, item){
			console.log(JSON.stringify(req.getAuthDetails()));
			db.fileExists(item.filestat, item.filedata, req.getAuthDetails(), function(result){
				if(!bFirst){
					res.write(',');
				}
				bFirst = false;

				res.write(JSON.stringify(result));;
				next();
			});
		}).then(function(){
			res.end(']');
		});
	}

	function routing(app){
		app.post("/", function(req, res, next){
			handleUpload(req, res, next);
		});
		app.post("/file", handleUpload);
		app.post("/check", checkStatus);
		// doesn't work yet
		//app.get("/file", handleDownload);
		app.get("/meta/:field/:value?/:ext", handleMeta);
		app.post("/register", handleRegister);
		app.get("/register", handleRegister);
	}

	server = connect.createServer(
		auth([ auth.Http({ validatePassword: validateUserPassword }) ]),
		form({keepExtensions: true}),
		connect.bodyDecoder(),
		connect.router(routing),
		staticProvider()
	);

	server.listen(8022);

	console.log("Server listening on port 8022");
}());
