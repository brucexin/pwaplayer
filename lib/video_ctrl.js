var URL = window.URL || window.webkitURL;
var VIDEOCTRL_ASPECT_RATIO_EVENT = "videoctrl-aspect-ratio";

class VideoCtrlBase {
    constructor(videoEl) {
        this._video = videoEl;
        this.width = 0;
        this.height = 0;
        this.ratio = null;
        this._userPlayed = false;
        this._userPaused = false;
        var self = this;

        this._on_loadedmetadata = () => {
          self.width = self._video.videoWidth;
          self.height = self._video.videoHeight;
          self.ratio = self.height/self.width;
          let arEvent = new CustomEvent(VIDEOCTRL_ASPECT_RATIO_EVENT, {detail: {'ctrl':self}});
          self._video.dispatchEvent(arEvent);
        }

        this._video.addEventListener("loadedmetadata", this._on_loadedmetadata, {});
    }

    _getVTTElement(parent) {
      var tracks = parent.getElementsByTagName('track')
      for (var i = 0; i < tracks.length; i++) {
        if (tracks[i].kind == "subtitles") {
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
        this.mode = "showing";
        //video.textTracks[0].mode = "showing"; // thanks Firefox
        track.mode = "showing";
      });
      console.log(`now video tracks length is ${video.textTracks.length}`);
      for(let i = 0; i < video.textTracks.length; ++i) {
        video.textTracks[i].mode = 'hidden';
      }
    }

    _removeAllTracks(video) {
      for(let track of video.getElementsByTagName('track')) {
        video.removeChild(track);
      }
    }

    free() {
      this._video.removeEventListener("loadedmetadata", this._on_loadedmetadata, {});
      this._video = null;
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

    get playbackRate() {
        return this._video.playbackRate;
    }

    get userPlayed() {
        return this._userPlayed;
    }

    setUserPlayed() {
        this._userPlayed = true;
        this._userPaused = false;
    }

    get userPaused() {
        return this._userPaused;
    }

    setUserPaused() {
        this._userPlayed = false;
        this._userPaused = true;
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

    set playbackRate(value) {
      this._video.playbackRate = value;
    }

    playLocalFile(file) {
      var fileURL = URL.createObjectURL(file);
      this._video.src = fileURL;
      this._video.play();
      this.setUserPlayed();
      return true;
    }

    playSource(src, playAtTime) {
      this._video.src = src;
      this._video.currentTime = playAtTime;
      this._video.play();
      this.setUserPlayed()
      return true;
    }

    pause() {
      this._video.pause();
      this.setUserPaused();
    }

    play() {
      this._video.play();
      this.setUserPlayed();
    }
  
    restart() {
      this._video.currentTime = 0;
      this.setUserPlayed();
    }

    seekTo(newTime) {
      this._video.currentTime = newTime;
    }

    setVTT(vttFile) {
      var URL = window.URL || window.webkitURL;
      var fileURL = URL.createObjectURL(vttFile);
      console.log(`set vtt ${fileURL}`);
  
      this._createVTTElement(this._video, fileURL);
    }

    clearVTT() {
      for(let track of this._video.textTracks) {
        track.mode = "disabled";
      }
      this._removeAllTracks(this._video);
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
    let self = this;

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

    this._on_loadeddata = () => {
      console.log('this is ', this);
      self._playThrough();
    }

    this._on_ended = () => {
      self._clearFrameCheckTimer();
    }
   
    this._video.addEventListener("ended", this._on_ended);
    this._playBegan = false;
    this._video.addEventListener("loadeddata", this._on_loadeddata);
    this._videoRight.addEventListener("loadeddata", this._on_loadeddata);
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

 

  free() {
    this._clearFrameCheckTimer();
    this._video.removeEventListener('loadeddata', this._on_loadeddata);
    this._video.removeEventListener('ended', this._on_ended);
    this._videoRight.removeEventListener('loadeddata', this._on_loadeddata);
    this._video = null;
    this._videoRight  = null;
    console.log('free PWASBSVideoCtrl');
  }

  clearVTT() {
    for(let track of this._video.textTracks) {
      track.mode = "disabled";
    }
    this._removeAllTracks(this._video);

    for(let track of this._videoRight.textTracks) {
      track.mode = "disabled";
    }
    this._removeAllTracks(this._videoRight);
  }

  set muted(value) {
    this._video.muted = value;
    this._videoRight.muted = value;
  }

  set volume(value) {
    this._video.volume = value;
    this._videoRight.volume = value;
  }

  set playbackRate(value) {
    this._video.playbackRate = value;
    this._videoRight.playbackRate = value;
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
    this.setUserPlayed();
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
    this.setUserPlayed();
    return true;
  }

  pause() {
    this._video.pause();
    this._videoRight.pause();
    this._clearFrameCheckTimer();
    this.setUserPaused();
  }

  play() {
    this._video.play();
    this._videoRight.play();
    this._startFrameCheckTimer();
    this.setUserPlayed();
  }

  restart() {
    this._video.currentTime = 0;
    this._videoRight.currentTime = 0;
    this.stats = {'missed':0};
    this._startFrameCheckTimer();
    this.setUserPlayed();
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

  removeAllTracks() {

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