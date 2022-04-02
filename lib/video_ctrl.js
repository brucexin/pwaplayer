var URL = window.URL || window.webkitURL;
var VIDEOCTRL_ASPECT_RATIO_EVENT = "videoctrl-aspect-ratio";

class VideoCtrlBase {
    constructor(videoEl) {
        this._video = videoEl;
        this.width = 0;
        this.height = 0;
        this.ratio = null;

        this._video.addEventListener("loadedmetadata", (e) => {
            this.width = this._video.videoWidth;
            this.height = this._video.videoHeight;
            this.ratio = this.height/this.width;
            let arEvent = new CustomEvent(VIDEOCTRL_ASPECT_RATIO_EVENT, {detail: {'ctrl':this}});
            this._video.dispatchEvent(arEvent);
          }, {});
    }

    get video() {
        return this._video;
    }

    get paused() {
        return this._video.paused;
    }

    get ended() {
        return this._video.ended;
    }

    get played() {
        return this._video.played;
    }    

    get currentTime() {
        return this._video.currentTime;
    }

    get duration() {
        return this._video.duration;
    }

    get src() {
        return this._video.src;
    }

    get muted() {
        return this._video.muted;
    }

    get volume() {
        return this._video.volume;
    }

    addEventListener(type, listener, options) {
        this._video.addEventListener(type, listener, options);
    }

    canPlay(file) {
        var type = file.type;
        var canPlay = this._video.canPlayType(type);
        if (canPlay === '') {
            return false;
        }
        return true;
    }
}

class PWAVideoCtrl extends VideoCtrlBase {
    constructor(video) {
        super(video);
    }

    set muted(value) {
      this._video.muted = value;
    }
  
    set volume(value) {
      this._video.volume = value;
    }

    playLocalFile(file) {
      var fileURL = URL.createObjectURL(file);
      this._video.src = fileURL;
      this._video.play();
      return true;
    }

    playSource(src, playAtTime) {
      this._video.src = src;
      this._video.currentTime = playAtTime;
      this._video.play();
      return true;
    }

    pause() {
      this._video.pause();
    }

    play() {
      this._video.play();
    }
  
    restart() {
      this._video.currentTime = 0;
    }

    seekTo(newTime) {
      this._video.currentTime = newTime;
    }

};

class PWASBSVideoCtrl extends VideoCtrlBase {
  MISSED_INTERVAL = 7.8;
  constructor(videoLeft, videoRight) {
    super(videoLeft);
    this._videoRight = videoRight;
    this._mediaTimeLeft = null;
    this._mediaTimeRight = null;
   
    this._userPlayed = false;
    this._userPaused = false;
    var self = this;

    this._video.autoplay = false;
    this._videoRight.autoplay = false;
    this._video.preload = "auto";
    this._videoRight.preload = "auto";
    
    // this._video.requestVideoFrameCallback((time, metadata) => {
    //     self._onFrameCallback(self._video, time, metadata);
    // });

    // this._videoRight.requestVideoFrameCallback((time, metadata) => {
    //   self._onFrameCallback(self._videoRight, time, metadata);
    // });
   
    this._video.addEventListener("ended", () => {
      self._clearFrameCheckTimer();
    });
    this._playBegan = false;
    this._video.addEventListener("loadeddata", () => {
      self._playThrough();
    });
    this._videoRight.addEventListener("loadeddata", () => {
      self._playThrough();
    });
    
  }

  _playThrough() {
    if(this._video.readyState >= 4 && 
        this._videoRight.readyState >= 4 && 
        !this._playBegan) {
        console.log('begin play');
        this._video.play();
        this._videoRight.play();
        this._playBegan = true;
    }
  }

  // _onFrameCallback(video, time, metadata) {
  //   if(video == this._video) {
  //     this._mediaTimeLeft = metadata.mediaTime;
  //   } else {
  //     this._mediaTimeRight = metadata.mediaTime;
  //   }
  // }

  _startFrameCheckTimer() {
    if(!this._frameCheckTimer) {
      // this._frameCheckTimer = setInterval(() => {
      //   if(this._mediaTimeLeft != this._mediaTimeRight) {
      //     console.log(`SBS mismatch: ${this._mediaTimeLeft} != ${this._mediaTimeRight}`);
      //     this.onRequestAnimate();
      //   }
      // }, 10);
      this._frameCheckTimer = true;
      var loop = () => {
        if(this._frameCheckTimer) {
          requestAnimationFrame(() => {
            this.onRequestAnimate();
            loop();
          });
        }
      };
      loop();
    }
  }

  _clearFrameCheckTimer() {
    if(this._frameCheckTimer) {
      // clearInterval(this._frameCheckTimer);
      this._frameCheckTimer = null;
      console.log('SBS play stats:', JSON.stringify(this.stats));
    }
  }

  _getVTTElement(parent) {
    var tracks = parent.getElementsByTagName('track')
    for (var i = 0; i < tracks.length; i++) {
      if (tracks[i].kind == "subtitles") {
        console.log(`get subtitles node:${tracks[i]}`);
        return tracks[i];
      }        
    }
    return null;
  }

  _createVTTElement(video, src) {
    var trackElem = document.createElement("track");
    trackElem.kind = "subtitles";
    trackElem.label = "English";
    trackElem.srclang = "en";
    trackElem.src = src;
    
    video.appendChild(trackElem);
    let track = video.textTracks[video.textTracks.length-1];
    trackElem.addEventListener("load", function() {
      console.log('vtt loading');
      this.mode = "showing";
      //video.textTracks[0].mode = "showing"; // thanks Firefox
      track.mode = "showing";
    });
    console.log(`now video tracks length is ${video.textTracks.length}`);
    for(let i = 0; i < video.textTracks.length; ++i) {
      video.textTracks[i].mode = 'hidden';
    }
  }

  set muted(value) {
    this._video.muted = value;
    this._videoRight.muted = value;
  }

  set volume(value) {
    this._video.volume = value;
    this._videoRight.volume = value;
  }

  playLocalFile(file) {
    var URL = window.URL || window.webkitURL;
    var fileURL = URL.createObjectURL(file);
    this._video.src = fileURL;
    this._videoRight.src = fileURL;
    // this._video.play();
    // this._videoRight.play();
    this.stats = {'missed':0};
    this._startFrameCheckTimer();
    this._userPlayed = true;
    this._userPaused = false;
    return true;
  }

  playSource(src, playAtTime) {
    this._video.src = src;
    this._videoRight.src = this._video.src;
    if(playAtTime) {
      this._video.currentTime = playAtTime;
      this._videoRight.currentTime = playAtTime;
    }
    this.stats = {'missed':0};
    // this._video.play();
    // this._videoRight.play();
    this._startFrameCheckTimer();
    this._userPlayed = true;
    this._userPaused = false;
    return true;
  }

  pause() {
    this._video.pause();
    this._videoRight.pause();
    this._clearFrameCheckTimer();
    this._userPaused = true;
    this._userPlayed = false;
  }

  play() {
    this._video.play();
    this._videoRight.play();
    this._startFrameCheckTimer();
    this._userPlayed = true;
    this._userPaused = false;
  }

  restart() {
    this._video.currentTime = 0;
    this._videoRight.currentTime = 0;
    this.stats = {'missed':0};
    this._startFrameCheckTimer();
    this._userPlayed = true;
    this._userPaused = false;
  }

  seekTo(newTime) {
    this._video.currentTime = newTime;
    this._videoRight.currentTime = newTime;
  }

  setVTT(vttFile) {
    var URL = window.URL || window.webkitURL;
    var fileURL = URL.createObjectURL(vttFile);
    console.log(`set vtt ${fileURL}`);

    this._createVTTElement(this._video, fileURL);
    this._createVTTElement(this._videoRight, fileURL);
  }

  onRequestAnimate() {
    if(!this._userPlayed) {
      return;
    }
    let leftTime  = Math.round(this._video.currentTime*1000);
    let rightTime  = Math.round(this._videoRight.currentTime*1000);
    if(Math.abs(leftTime - rightTime) > this.MISSED_INTERVAL) {
        console.log("play time miss match",leftTime, rightTime);
    };

  }

};

export {
    PWAVideoCtrl,
    PWASBSVideoCtrl,
    VIDEOCTRL_ASPECT_RATIO_EVENT
}