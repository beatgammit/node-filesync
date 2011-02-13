var http = require('http'),
	fs = require('fs'),
	path = require('path'),
	inotifyplusplus = require('inotify-plusplus'),
	walk = require('walk');

var inotify = inotifyplusplus.create(true);

var watchedDirs = new Array();
var blacklist = ['cache'];

var directive = {
	close_write: true,
	create: true,
	delete_self: true,
	delete: true,
	modify: true,
	move: true,
	all_events: function(ev){
		fs.readFile(path.join(ev.watch, ev.name), function(err, data){
			if(!err && data){
				fs.writeFile(path.join("/home/jameson/.testNotify", ev.name), data, function(err){
					if(!err){
						console.log("File modified: " + ev.name);
					}
				});
			}
		});
	}
};

function addWatches(out, start){
	var walker = walk(start);
	walker.on('directories', function(path, stats, next){
		for(var i = 0; i < stats.length; i++){
			if(blacklist.indexOf(stats[i].name) >= 0 || stats[i].name.indexOf(".") == 0){
				stats.splice(i, 1);
				i--;
			}
		}

		inotify.watch(directive, path);

		out.push(path);
		next();
	});

	walker.on('end', function(){
		console.log("End recursion. " + out.length + " directories watched.");
		//for(var i = 0; i < out.length; i++){
		//	console.log(out[i]);
		//}

		//setTimeout(process.exit, 100);
	});
}

var server = http.createServer(function(req, res){
	res.writeHead(200, {'Content-Type' : 'text/plain'});
	res.end('Hello Node!!');
});

server.listen(3022);

addWatches(watchedDirs, '/home');

console.log('Server running on port 3022');
