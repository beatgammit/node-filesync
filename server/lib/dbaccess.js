(function(){
	"use strict";

	var mime = require('mime'),
		crypto = require('crypto'),
		cradle = require('cradle'),
		client = new cradle.Connection('http://www.beatgammit.com', 5984, {
				auth: {username: "filesync", password: "Wh1t3Ch3dd3r"}
			}),
		filesyncdb = client.database('filesync'),
		viewPrototype = function(doc){if(doc.type === '{0}'){emit(doc.mtime, doc);}}.toString(),
		viewRegex = /\{0\}/;

	function saveToDb(fileStat, username){
		var userDb;

		filesyncdb.get(fileStat.md5, function(err, doc){
			var tFileDoc = {};
			if(err){
				tFileDoc = {md5: fileStat.md5, tmd5: fileStat.tmd5, owners: []};
			}else{
				tFileDoc = doc;
			}

			if(tFileDoc.owners.indexOf(username) < 0){
				tFileDoc.owners.push(username);
			}

			filesyncdb.save(tFileDoc.md5, tFileDoc);
		});

		userDb = client.database(username);
		userDb.get(fileStat.qmd5, function(err, doc){
			if(err){
				// remove the functions from fileStat
				userDb.save(fileStat.qmd5, JSON.parse(JSON.stringify(fileStat)));
			}
		});
	}

	function getByMimeType(username, mimeType, callback){
		console.log("User: " + username);
		console.log("Mime: " + mimeType);
		var userDb = client.database(username);

		mimeType = mimeType.replace('/', '%2F');
		userDb.view('type/' + mimeType, function(error, response){
			console.log(response);
			var docArray = [];
			if(error){
				console.log("Epic error fail: " + JSON.stringify(error));
				callback(error);
				return;
			}

			response['rows'].forEach(function(tDoc){
				console.log(JSON.stringify(tDoc.value));
				docArray.push(tDoc.value);
			});

			callback(null, docArray);
		});
	}

	function createViews(username, data){
		var userDb;
		console.log("Create Views: " + username);
		if(data && data.length){
			userDb = client.database(username);
			userDb.get('_design/type', function(error, doc){
				var tDesign = {};
				if(!error){
					tDesign = doc;
				}

				if(!tDesign.views){
					tDesign.views = {};
				}

				data.forEach(function(fileStat){
					var mimeType;

					mimeType = fileStat.type;
					if(!tDesign.views[mimeType]){
						tDesign.views[mimeType] = {};
						tDesign.views[mimeType].map = viewPrototype.replace(viewRegex, mimeType);
					}
				});

				userDb.save('_design/type', tDesign.views); 
			});
		}
	}

	function registerUser(name, pass, userData, callback){
		var userDB;
		userDB = client.database('_users');

		userDB.get('org.couchdb.user:' + name, function(err, doc){
			var userDoc, newDb;
			if(doc){
				callback("User exists");
				return;
			}

			userDoc = {};
			userDoc.name = name;
			userDoc.type = "user";
			userDoc.roles = [];
			userDoc.data = userData;
			userDoc.salt = crypto.createHash('sha1').update(new Date()).digest('hex');
			userDoc.password_sha = crypto.createHash('sha1').update(pass + userDoc.salt).digest('hex');

			userDB.save('org.couchdb.user:' + name, userDoc);

			// create a new db for this user
			newDb = client.database(name);
			newDb.create();

			callback();
		});
	}

	function fileExists(filestat, filedata, username, callback){
		filesyncdb.view('basic/' + 'tmd5', {startKey: filestat.tmd5, limit: 1},
				function(err, response){
			console.log("Filestat:");
			console.log(filestat);
			var tDb;
			if(err || response.total_rows == 0){
				filestat.exists = false;
				filestat.err = err;
				callback(filestat);
				return;
			}

			tDb = client.database(username);
			tDb.get(filedata.qmd5, function(error, doc){
				if(err){
					tDb.save(tDb._id, filedata);

					filestat.exists = true;
					filestat.err = err;

					callback(filestat);
					return;
				}

				filestat.exists = true;
				callback(filestat);
				return;
			});
		});
	}

	module.exports.put = saveToDb;
	module.exports.getByMimeType = getByMimeType;
	module.exports.createViews = createViews;
	module.exports.registerUser = registerUser;
	module.exports.fileExists = fileExists;
})();
