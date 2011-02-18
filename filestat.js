var exports;

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

exports = FileStat;
