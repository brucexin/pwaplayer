function removeWord(removed, origin) {
    let regex = new RegExp(`(?:^|\\s+)${removed}(?:$|\s+)`);
    return origin.replace(regex, ' ');
}

function addWord(added, origin) {
    return origin + ' ' + added; 
}

function hasWord(checked, origin) {
    let regex = new RegExp(`(?:^|\\s+)${checked}(?:$|\s+)`);
    return origin.match(regex);
}

function secondsToHMS(secs) {
    let h = secs/3600;
    let m = 0;
    let s = 0;
    if(!Number.isInteger(h)) {
      m = (secs%3600)/60;
      if(!Number.isInteger(m)) {
        s = (secs%3600)%60;
        m = Math.floor(m);
      }
      h = Math.floor(h);
    }
    return `${h}`.padStart(2, '0')+':'+`${m}`.padStart(2, '0')+':'+`${s}`.padStart(2, '0');
  }

export {
    removeWord,
    addWord,
    hasWord,
    secondsToHMS
}