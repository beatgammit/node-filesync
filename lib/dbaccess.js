(function(){
	"use strict";
	var mime = require('mime'),
		couchdb = require('couchdb-tmp'),
		client = couchdb.createClient(5984, '192.168.1.100'),
		filesyncdb = client.db('filesync'),
		viewPrototype = "function(doc){if(doc.contentType === {0}){emit(doc.qmd5, doc);}}",
		viewRegex = /\{0\}/;

	function saveToDb(key, value){
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
					//console.log("Key: " + key);
					//console.log("Value: " + JSON.stringify(value));
				}
			});
		});
	}

	function getByMimeType(mimeType, callback){
		filesyncdb.view('contentType', mimeType, function(error, response){
			var docArray = [];
			if(error){
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

	function createViews(data){
		if(data && data.length){
			filesyncdb.getDoc('_design/contentType', function(error, doc){
				var tDesign = {};
				if(!error){
					tDesign = doc;
				}

				if(!tDesign.viems){
					tDesign.views = {};
				}

				data.forEach(function(fileStat){
					var tView, mimeType;

					mimeType = fileStat.contentType;
					if(!tDesign.views[mimeType]){
						tView = viewPrototype.replace(viewRegex, mimeType);
						tDesign.views[mimeType] = tView;
					}
				});
			});
		}
	}

	module.exports.put = saveToDb;
	module.exports.getByMimeType = getByMimeType;
	module.exports.createViews = createViews;
})();
