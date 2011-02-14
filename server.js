var connect = require('connect'),
	crypto = require('crypto'),
	fs = require('fs'),
	util = require('utils'),
	path = require('path'),
	exec = require('child_process').exec,
	form = require('connect-form');

var hashAlgo = "md5",
	fileQueue = new Array(),
	regex = /(..)(..)(..)(..).*/,
	doc_root = "./media/";

function moveFile(oldPath, newPath){
	fs.rename(oldPath, newPath, function(err){
		if(err){
			console.log("Move Error: " + err);

			// backup plan
			var is = fs.createReadStream(oldPath)
			var os = fs.createWriteStream(newPath);

			util.pump(is, os, function() {
			    fs.unlinkSync(oldPath);
			});
		}
	});
}

function putKeyValue(key, value){
	console.log("Key: " + key);
	console.log("Value: " + value);
}

function FileStat(){
}

FileStat.prototype = {
	checkSum: function(callback){
		var hash, matches,
			hashData = "" + this.mtime + this.size + this.path;
		if(this.path && this.mtime && this.size){
			hash = crypto.createHash(hashAlgo).update(hashData).digest("hex");

			matches = this.qmd5 ? (this.qmd5 == hash) : true;

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
		if(fileStat.md5 && fileStat.md5 != hashVal){
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
	if(req.form){
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
					if(equal){
						oldPath = files[hash].path;
						saveFile(oldPath, this, function(success, newPath){
							if(success){
								res.writeHead(200, {'Content-Type': 'application/json'});
								res.end(JSON.stringify(tFileStat));

								putKeyValue(hash, newPath);
							}else{
								res.writeHead(404, {'Content-Type': 'application/json'});
								tFileStat.err = "File did not save";
								res.end(JSON.stringify(tFileStat));
							}
						});
					}else{
						res.writeHead(404, {'Content-Type': 'application/json'});
						tFileStat.err = "Sum not equal";
						res.end(JSON.stringify(tFileStat));
					}
				});
			});
		});
	}else{
		next();
	}
}

var server = connect.createServer(
	form({keepExtensions: true}),
	handleUpload,
	connect.staticProvider()
);

server.listen(8022);

console.log("Server listening on port 8022");
