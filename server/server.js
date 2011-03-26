/*
 * Copyright 2011 T. Jameson Little, AJ ONeal
 * MIT Licensed
 */
var require;
(function () {
	"use strict";

	require('noop');
	//require('long-stack-traces');
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
		compress = require('compressor'),
		Tar = require("tar-async"),
		server;

	// try to rename first, copy as a backup plan
	fs.move = function (oldPath, newPath, cb) {
		fs.rename(oldPath, newPath, function(err){
			if (!err) {
				return doop(cb);
			}

			// backup plan
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
		var dbaccess, mimeType,
			user = req.remoteUser,
			category = req.params.field,
			type = req.params.value;

		if(!req.params.field){
			return next();
		}
		
		dbaccess = require('./lib/dbaccess')

		// if they have supplied the full mimetype
		if(req.params.value){
			mimeType = category + "/" + type;

			dbaccess.getByMimeType(user, mimeType, function(error, result){
				res.writeHead(200, {'Content-Type': 'application/json'});
				if(error){
					res.end(JSON.stringify(error));
				}else{
					res.end(JSON.stringify(result));
				}
			});
		}else{
			// they want a category
			dbaccess.getMimeCategories(user, category, function(error, result){
				var bFirst = true;

				res.writeHead(200, {'Content-Type': 'application/json'});

				if(error){
					res.end(JSON.stringify(error));
					return;
				}
				console.log(result);

				res.write('[');
				result.forEachAsync(function(next, item){
					console.log(item);
					dbaccess.getByMimeType(user, item, function(error, result){

						result.forEach(function(tDoc){
							if(!bFirst){
								res.write(',');
							}
							bFirst = false;

							res.write(JSON.stringify(tDoc));
						});

						next();
					});
				}).then(function(){
					res.end(']');
				});
			});
		}
	}

	function handleRegister(req, res){
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

	function handleDownload(req, res, next){
		var tape, gzip;
		req.params.files = [{path: "./lib/dbaccess.js"}, {path: "./lib/import.js"}];
		
		gzip = new compress.GzipStream();
		gzip.setEncoding('binary');
		gzip.addListener('data', function(data) {
			res.write(data, 'binary');
		}).addListener('error', function(error) {
			console.log(error);
			throw error;
		}).addListener('end', function() {
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


		if(req.params.files){
			res.writeHead(200, {'Content-Type': 'application/x-gzip'});

			req.params.files.forEachAsync(function(cb, item){
				tape.append(item.path, function(err){
					if(err){
						console.log(err);
						throw error;
					}

					cb();
				});
			}).then(function(){
				tape.close();
			});
			return;
		}else if(req.params.path || filePath){
			if(!req.params.path){
				req.params.path = filePath;
			}
			res.writeHead(200, {'Content-Type': 'application/x-gzip'});

			tape.append(req.params.path, function(err){
				if(err){
					console.log(err);
					throw error;
				}

				tape.close();
			});
			return;
		}else{
			return next();
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
		app.get("/file", handleDownload);
		app.get("/meta/:field/:value?", handleMeta);
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
