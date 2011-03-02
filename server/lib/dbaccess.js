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

	function saveToDb(key, value){
		var docData = {
			'key': key,
			'value': value
		};

		console.log(JSON.stringify(docData));
		filesyncdb.get(key, function(err, doc){
			if(doc){
				docData = doc;
				doc['value'] = value;
			}

			filesyncdb.save(key, docData);
		});
	}

	function getByMimeType(mimeType, callback){
		mimeType = mimeType.replace('/', '%2F');
		console.log(mimeType);
		filesyncdb.view('type/' + mimeType, function(error, response){
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
				filesyncdb.save('_design/type', tDesign); 
			});
		}
	}

	function registerUser(name, pass, userData, callback){
		var userDB;
		userDB = client.db('_users');

		userDB.get('org.couchdb.user:' + name, function(err, doc){
			var userDoc, newDb;
			if(!doc){
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
			}

			callback(err ? "success" : doc);
		});
	}

	function fileExists(filestat, filedata, username, callback){
		var query = {startKey: filestat.tmd5, limit: 1};
		filesyncdb.view('basic/' + 'tmd5', function(err, response){
			var tDb;
			if(err || response.total_rows == 0){
				callback({exists: false, err: err});
				return;
			}

			tDb = client.db(username);
			tDb.get(filedata.qmd5, function(error, doc){
				if(err){
					tDb.save(tDb._id, filedata);
					callback({exists: true, err: err});
					return;
				}

				callback({exists: true});
			});
		});
	}

	module.exports.put = saveToDb;
	module.exports.getByMimeType = getByMimeType;
	module.exports.createViews = createViews;
	module.exports.registerUser = registerUser;
})();
