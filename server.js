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
	filesyncdb.getDoc(value, function(err, doc){
		if(doc){
			docData = doc;
			doc['value'] = value;
		}

		filesyncdb.saveDoc(key, docData, function(err, ok){
			if(err){
				console.log("DBError: " + JSON.stringify(err));
			}else{
				console.log("Key: " + key);
				console.log("Value: " + value);
			}
		});
	});
}

function FileStat(){
}

FileStat.prototype = {
	checkSum: function(callback){
		var hash, matches,
			hashData = this.mtime.toString() + this.size.toString() + this.path;
		if(this.path && this.mtime && this.size){
			hash = crypto.createHash(hashAlgo).update(hashData).digest("hex");

			matches = this.qmd5 ? (this.qmd5 === hash) : true;

			this.qmd5 = hash;

			console.log(this, hash);
			
			callback(matches, hash);
		}
	}
};

function saveFile(filePath, fileStat, callback){
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
		throw err;
	});

	readStream.on('end', function(){
		var hashVal = hash.digest("hex"), m, newPath;
		
		// if we have a md5sum and they don't match, abandon ship
		if(fileStat.md5 && fileStat.md5 !== hashVal){
			// we don't care about the callback
			fs.unlink(filePath);
			callback(false);
		}else{
			this.md5 = hashVal;

			m = hashVal.match(regex);
			newPath = path.join(doc_root, m[1], m[2], m[3], m[4]);

			path.exists(newPath, function(exists){
				var tJoin = path.join(newPath, m[0]);

				if(!exists){
					exec('mkdir -p ' + newPath, function(err, stdout, stderr){
						console.log("Err: " + (err ? err : "none"));
						console.log("stdout: " + (stdout ? stdout : "none"));
						console.log("stderr: " + (stderr ? stderr : "none"));
						moveFile(filePath, tJoin);
					});
				}else{
					moveFile(filePath, tJoin);
				}
				this.path = newPath;
			});
			callback(true, newPath);
		}
	});
}

function handleUpload(req, res, next){
	var tFileStat;
	if(!req.form){
		return next();
	}

	req.form.complete(function(err, fields, files){

		fields.stats = JSON.parse(fields.stats);
		fields.statsHeader = JSON.parse(fields.statsHeader);
		fields.stats.forEach(function(item, index, thisArray){
			tFileStat = new FileStat();

			item.forEach(function(field, index, thisArray){
				tFileStat[fields.statsHeader[index]] = field;
			});

			tFileStat.checkSum(function(equal, hash){
				var oldPath;
				if(!equal){
					tFileStat.err = "Sum not equal";
					res.writeHead(200, {'Content-Type': 'application/json'});
					res.write(JSON.stringify(tFileStat));
					res.end();
					return;
				}

				oldPath = files[hash].path;
				saveFile(oldPath, this, function(success, newPath){
					if(success){
						res.writeHead(200, {'Content-Type': 'application/json'});
						res.write(JSON.stringify(tFileStat));
						res.end();

						putKeyValue(hash, newPath);
					}else{
						tFileStat.err = "File did not save";
						res.writeHead(200, {'Content-Type': 'application/json'});
						res.write(JSON.stringify(tFileStat));
						res.end();
					}
				});
			});
		});
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
