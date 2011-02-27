    blacklist = [/^\./, /^\.?cached?$/i, /^te?mp$/i, /^\.trash$/i, /^\.trash-?.*/i];

  function excludeDirs(path, stats, next) {
    var i = 0, j, black;

    while(i < stats.length) {
      black = false;

      for(j = 0; j < blacklist.length; j += 1) {
        if (blacklist[j].test(stats[i].name)) {
          black = true;
          break;
        }
      }

      if (black) {
        stats.splice(i, 1);
      } else {
        i += 1;
      }
    }

    next();
  }
