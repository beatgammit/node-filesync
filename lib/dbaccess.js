(function(){
	"use strict";

	var mime = require('mime'),
		couchdb = require('couchdb-tmp'),
		client = couchdb.createClient(5984, 'www.beatgammit.com', "filesync", "Wh1t3Ch3dd3r"),
		filesyncdb = client.db('filesync'),
		viewPrototype = function(doc){if(doc.value.contentType === '{0}'){emit(doc.qmd5, doc);}}.toString(),
		viewRegex = /\{0\}/;

	function saveToDb(key, value){
		var docData = {
			'key': key,
			'value': value
		};

		console.log(JSON.stringify(docData));
		filesyncdb.getDoc(key, function(err, doc){
			if(doc){
				docData = doc;
				doc['value'] = value;
			}

			filesyncdb.saveDoc(key, docData, function(error, ok){
				if(error){
					console.log("DBError: " + JSON.stringify(error));
				}else{
					//console.log("Key: " + key);
					//console.log("Value: " + JSON.stringify(value));
				}
			});
		});
	}

	function getByMimeType(mimeType, callback){
		mimeType = mimeType.replace('/', '%2F');
		console.log(mimeType);
		filesyncdb.view('contentType', mimeType, function(error, response){
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
					var mimeType;

					mimeType = fileStat.contentType;
					if(!tDesign.views[mimeType]){
						tDesign.views[mimeType] = {};
						tDesign.views[mimeType].map = viewPrototype.replace(viewRegex, mimeType);
						
					}
				});

				console.log(tDesign);
				filesyncdb.saveDesign('contentType', tDesign); 
			});
		}
	}

	module.exports.put = saveToDb;
	module.exports.getByMimeType = getByMimeType;
	module.exports.createViews = createViews;
})();
