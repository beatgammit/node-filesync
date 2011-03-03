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
		console.log("Validate");
		if (authdb[username] && authdb[username] === password) {
			if(onSuccess){
				return onSuccess();
			}else{
				// using basicAuth
				return true;
			}
		}

		if(onFailure){
			onFailure(new Error("Username and password don't pass"));
		}
		return false;
	}

	function handleMeta(req, res, next){
		var urlObj, query, dbaccess = require('./lib/dbaccess'), mimeType;

		if(req.params.field && req.params.value){
			mimeType = req.params.field + "/" + req.params.value;
					
			dbaccess.getByMimeType(mimeType, function(err, docArray){
				console.log(JSON.stringify(docArray));
				res.writeHead(200, {'Content-Type': 'application/json'});
				res.end(JSON.stringify(docArray));
			});
		}else{
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.end("{err: 'Not implemented, sorry'}");
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
		}else{
			db.registerUser(req.body.user, fields.pass, fields.data, function(err){
				res.writeHead(200, {'Content-Type': 'application/json'});
				if(err){
					res.end(JSON.stringify({error: err}));
				}else{
					res.end(JSON.stringify({success: true}));
				}
			});
		}
	}

	function checkStatus(req, res, next){
		var bFirst = true;

		res.writeHead(200, {'Content-Type': 'application/json'});
		res.write('[');
		req.body.files.forEachAsync(function(next, item){
			db.fileExists(item.filestat, item.filedata, req.remoteUser, function(result){
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
		app.get("/meta/:field/:value", handleMeta);
		app.post("/register", handleRegister);
		app.get("/register", handleRegister);
	}

	server = connect(
		// the new connect change broke this
		//auth([ auth.Http({ validatePassword: validateUserPassword }) ]),
		connect.basicAuth(validateUserPassword),
		form({keepExtensions: true}),
		connect.bodyParser(),
		connect.router(routing),
		connect.static("./")
	);

	server.listen(8022);

	console.log("Server listening on port 8022");
}());
