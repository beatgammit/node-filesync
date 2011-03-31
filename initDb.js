var cradle = require('cradle'),
	client = new cradle.Connection('http://www.beatgammit.com', 5984, {
			auth: {username: "filesync", password: "Wh1t3Ch3dd3r"}
		}),
	db = client.database('filesync'),
	userDb = client.database('_users'),
	tmd5Proto = function(doc){
		emit(doc.tmd5, doc);
	};

function initViews(){
	var tDesign = {};
	tDesign.tmd5 = {};
	tDesign.tmd5.map = tmd5Proto.toString();

	db.save('_design/basic', tDesign);
}

db.exists(function(exists){
	if(exists){
		db.destroy();
	}
	db.create();
	initViews();
});

userDb.get('org.couchdb.user:mvndaai', function(err, doc){
	if(doc){
		userDb.remove(doc._id, doc._rev, function(error, res){
			console.log(error);
			console.log(res);
		});
		var tUserDb = client.database(doc.name);
		tUserDb.exists(function(exists){
			if(exists){
				tUserDb.destroy();
			}
		});
	}
});

userDb.get('org.couchdb.user:coolaj86', function(err, doc){
	if(doc){
		userDb.remove(doc._id, doc._rev);
		var tUserDb = client.database(doc.name);
		tUserDb.exists(function(exists){
			if(exists){
				tUserDb.destroy();
			}
		});
	}
});

userDb.get('org.couchdb.user:beatgammit', function(err, doc){
	if(doc){
		userDb.remove(doc._id, doc._rev);
		var tUserDb = client.database(doc.name);
		tUserDb.exists(function(exists){
			if(exists){
				tUserDb.destroy();
			}
		});
	}
});
