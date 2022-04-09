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

  class SimpleDebouncer {
    constructor(func, waitMS) {
      this._func = func;
      this._waitMS = waitMS;
      // this._lastTriggerTime = null;
      this._timer = null;
      this._args = null;
      this._trigger = () => {
        try {
          this._func(...this._args);
        } catch(error) {
          console.log('error when Debounce', error);
        } finally {
          this._timer = null;
        }
      }
    }

    call(...args) {
      // console.log('debouncer call ', this._func, this._waitMS);
      // let nowTime = Date.now();
      if(this._timer) {
        clearTimeout(this._timer);
        this._timer = null;
      }
      this._timer = setTimeout(this._trigger, this._waitMS);
      this._args = args;
    }
  }

  function parseFloatWithDefault(str, defaultVal=.0) {
    let result = parseFloat(str);
    return isNaN(result) ? defaultVal : result;
  }

export {
    removeWord,
    addWord,
    hasWord,
    secondsToHMS,
    SimpleDebouncer,
    parseFloatWithDefault
}