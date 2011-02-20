/*
 * Copyright 2011 T. Jameson Little, AJ ONeal
 * MIT Licensed
 */
//(function(){

"use strict";
var require,
	connect = require('connect'),
	crypto = require('crypto'),
	fs = require('fs'),
	util = require('util'),
	path = require('path'),
	exec = require('child_process').exec,
	form = require('connect-form'),
	staticProvider = require("./static"),
	couchdb = require('couchdb-tmp'),
	client = couchdb.createClient(5984, '192.168.1.100'),
	filesyncdb = client.db('filesync'),
	FileStat = require('./filestat.js'),
	hashAlgo = "md5",
	regex = /(..)(..)(..)(..).*/,
	doc_root = "./media/",
	server;

function moveFile(oldPath, newPath){
	// try to rename first, copy as a backup plan
	fs.rename(oldPath, newPath, function(err){
		var readStream, writeStream;
		if(err){
			console.log("Move Error: " + err);

			// backup plan
			readStream = fs.createReadStream(oldPath);
			writeStream = fs.createWriteStream(newPath);

			util.pump(readStream, writeStream, function() {
				fs.unlinkSync(oldPath);
			});
		}
	});
}

function putKeyValue(key, value){
	var docData = {
		'key': key,
		'value': value
	};
	filesyncdb.getDoc(key, function(err, doc){
		if(doc){
			docData = doc;
			doc['value'] = value;
		}

		filesyncdb.saveDoc(key, docData, function(err, ok){
			if(err){
				console.log("DBError: " + JSON.stringify(err));
			}else{
				console.log("Key: " + key);
				console.log("Value: " + JSON.stringify(value));
			}
		});
	});
}

function readFile(filePath, callback){
	var readStream,
		hash = crypto.createHash(hashAlgo);

	readStream = fs.createReadStream(filePath);

	readStream.on('data', function(data){
		hash.update(data);
	});

	readStream.on('error', function(err){
		console.log("Read Error: " + err.toString());
		readStream.destroy();
		fs.unlink(filePath);
		callback(err);
	});

	readStream.on('end', function(){
		callback(undefined, hash.digest("hex"));
	});
}

function saveFile(md5, fileStat, filePath, callback){
	var m, newPath;
	// if we have an md5sum and they don't match, abandon ship
	if(fileStat.md5 && fileStat.md5 !== md5){
		// we don't care about the callback of unlink
		callback(false);
		return;
	}

	// just in case this hasn't been set yet
	fileStat.md5 = md5;

	m = md5.match(regex);
	newPath = path.join(doc_root, m[1], m[2], m[3], m[4]);

	path.exists(newPath, function(exists){
		fileStat.path = path.join(newPath, m[0]);
		if(!exists){
			exec('mkdir -p ' + newPath, function(err, stdout, stderr){
				var err;
				if(err || stderr){
					err = {error: err, stderr: stderr};
				}

				console.log("Err: " + (err ? err : "none"));
				console.log("stdout: " + (stdout ? stdout : "none"));
				console.log("stderr: " + (stderr ? stderr : "none"));
				moveFile(filePath, fileStat.path);

				callback(err, fileStat);
			});
		}else{
			moveFile(filePath, fileStat.path);

			callback(undefined, fileStat);
		}
	});
}

function compileFileStats(statsHeader, stats){
	var fileStats = [];
	stats.forEach(function(item, index, statsArray){
		tFileStat = FileStat();

		item.forEach(function(field, index, itemArray){
			tFileStat[statsHeader[index]] = field;
		});
		fileStats.push(tFileStat);
	});
	return fileStats;
}

function uploadFile(tFileStat, files, callback){
	tFileStat.checksum(function(equal, hash){
		var oldPath;
		if(!equal){
			tFileStat.err = "Sum not equal";
			callback(tFileStat);
			return;
		}

		oldPath = files[hash].path;
		readFile(oldPath, function(err, md5){
			if(!err){
				saveFile(md5, this, oldPath, function(err, fileStat){
					if(err){
						fileStat.unlink(oldPath);
						fileStat.err = "File did not save";
						callback(fileStat);
					}else{
						putKeyValue(hash, fileStat);
						callback(fileStat);
					}
				});
			}else{
				tFileStat.err = err;
				callback(tFileStat);
			}
		});
	});
}

function handleUpload(req, res, next){
	var tFileStat;
	if(!req.form){
		return next();
	}

	req.form.complete(function(err, fields, files){
		var fileStats;

		fields.statsHeader = JSON.parse(fields.statsHeader);
		fields.stats = JSON.parse(fields.stats);

		fileStats = compileFileStats(fields.statsHeader, fields.stats);

		res.writeHead(200, {'Content-Type': 'application/json'});

		fileStats.forEach(function(tFileStat, index, thisArray){
			uploadFile(tFileStat, files, function(fileStat){
				if(fileStat){
					console.log("FileStat: ");
					console.log(fileStat);
					//console.log(JSON.stringify(fileStat));
					res.write(JSON.stringify(fileStat));
				}
			});
		});

		res.end();
	});
}

server = connect.createServer(
	form({keepExtensions: true}),
	handleUpload,
	staticProvider()
);

server.listen(8022);

console.log("Server listening on port 8022");

//})();
