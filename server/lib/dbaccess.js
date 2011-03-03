(function(){
	"use strict";

	var mime = require('mime'),
		crypto = require('crypto'),
		cradle = require('cradle'),
		client = new cradle.Connection('http://www.beatgammit.com', 5984, {
				auth: {username: "filesync", password: "Wh1t3Ch3dd3r"}
			}),
		filesyncdb = client.database('filesync'),
		viewPrototype = function(doc){if(doc.value.type === '{0}'){emit(doc.mtime, doc);}}.toString(),
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

			if(tFileDoc.indexOf(username) < 0){
				tFileDoc.push(username);
			}

			filesyncdb.save(tFileDoc.md5, tFileDoc);
		});

		userDb = client.db(username);
		userDb.get(fileStat.qmd5, function(err, doc){
			if(err){
				// remove the functions from fileStat
				userDb.save(fileStat.qmd5, JSON.parse(JSON.stringify(fileStat)));
			}
		});
	}

	function getByMimeType(mimeType, callback){
		mimeType = mimeType.replace('/', '%2F');
		filesyncdb.view('type/' + mimeType, function(error, response){
			console.log(response);
			var docArray = [];
			if(error){
				console.log("Epic error fail: " + JSON.stringify(error));
				callback(error);
				return;
			}

			console.log(JSON.stringify(response));

			response['rows'].forEach(function(tDoc){
				console.log(JSON.stringify(tDoc.value));
				docArray.push(tDoc.value);
			});

			callback(null, docArray);
		});
	}

	function createViews(data){
		console.log("Create Views");
		console.log(JSON.stringify(data));
		if(data && data.length){
			filesyncdb.get('_design/type', function(error, doc){
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

				console.log(tDesign);
				filesyncdb.save('_design/type', tDesign.views); 
			});
		}
	}

	function registerUser(name, pass, userData, callback){
		var userDB;
		userDB = client.db('_users');

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

			userDB.saveDoc('org.couchdb.user:' + name, userDoc);

			// create a new db for this user
			newDb = client.db(name);
			newDb.create();

			callback();
		});
	}

	function fileExists(filestat, filedata, username, callback){
		filesyncdb.view('tmd5/' + 'tmd5', {startKey: filestat.tmd5, limit: 1},
				function(err, response){
			console.log("Filestat:");
			console.log(filestat);
			var tDb;
			if(err || response.total_rows == 0){
				callback({exists: false, err: err});
				return;
			}

			tDb = client.database(username);
			tDb.get(filedata.qmd5, function(error, doc){
				if(err){
					tDb.save(tDb._id, filedata);
					callback({exists: true, err: err});
					return;
				}

				callback({exists: true});
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
