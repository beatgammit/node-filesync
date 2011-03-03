var couchdb = require('couchdb-tmp'),
	client = couchdb.createClient(5984, 'www.beatgammit.com', "filesync", "Wh1t3Ch3dd3r"),
	db = client.db('filesync'),
	tmd5Proto = function(doc){
		emit(doc.tmd5, doc);
	};

function initViews(){
	var tDesign = {};
	tDesign.views = {};
	tDesign.views.tmd5 = {};
	tDesign.views.tmd5.map = tmd5Proto.toString();

	db.saveDesign('basic', tDesign);
}

db.exists(function(exists){
	if(!exists){
		db.create(initViews);
	}
});
