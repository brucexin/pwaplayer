var URL = window.URL || window.webkitURL;
VIDEOCTRL_ASPECT_RATIO_EVENT = "videoctrl-aspect-ratio";

class VideoCtrlBase {
    constructor(videoEl) {
        this._video = videoEl;
        this.width = 0;
        this.height = 0;
        this.ratio = null;

        this._video.addEventListener("loadedmetadata", (e) => {
            self.width = self._video.videoWidth;
            self.height = self._video.videoHeight;
            self.ratio = self.height/self.width;
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
  constructor(videoLeft, videoRight) {
    super(videoLeft);
    this._videoRight = videoRight;
    // this._vttTrackLeft = this._getVTTElement(videoLeft);
    // this._vttTrackLeft.mode = "hidden";
    // this._vttTrackRight = this._getVTTElement(videoRight);
    // this._vttTrackRight.mode = "hidden";
    this._mediaTimeLeft = null;
    this._mediaTimeRight = null;
    
    this._video.addEventListener("ended", (e) => {
      console.log('play ended');
      this._clearFrameCheckTimer();
    });

    this._videoRight.addEventListener("loadedmetadata", (e) => {
      console.log(`loadedmetadata right ${self._videoRight.videoWidth}`);
    });

    this._video.addEventListener("canplaythrough", (e) => {
      console.log('left canplaythrough');
      console.log('left buffered ', this._video.buffered.start(0), this._video.buffered.end(0));
    });

    this._videoRight.addEventListener("canplaythrough", (e) => {
      console.log('right canplaythrough');
      console.log('right buffered ', this._videoRight.buffered.length);
    });
    
    this._video.requestVideoFrameCallback((time, metadata) => {
        self._onFrameCallback(self._video, time, metadata);
    });

    this._videoRight.requestVideoFrameCallback((time, metadata) => {
      self._onFrameCallback(self._videoRight, time, metadata);
    });
   
    
  }

  _onFrameCallback(video, time, metadata) {
    if(video == this._video) {
      this._mediaTimeLeft = metadata.mediaTime;
    } else {
      this._mediaTimeRight = metadata.mediaTime;
    }
  }

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
    var fileURL = URL.createObjectURL(file);
    this._video.src = fileURL;
    this._videoRight.src = fileURL;
    this._video.play();
    this._videoRight.play();
    this.stats = {'missLeft':0,'missRight':0};
    this._startFrameCheckTimer();
    return true;
  }

  playSource(src, playAtTime) {
    this._video.src = src;
    this._videoRight.src = this._video.src;
    if(playAtTime) {
      this._video.currentTime = playAtTime;
      this._videoRight.currentTime = playAtTime;
    }
    this._video.play();
    this._videoRight.play();
    this.stats = {'missLeft':0,'missRight':0};
    this._startFrameCheckTimer();
    return true;
  }

  pause() {
    this._video.pause();
    this._videoRight.pause();
    this._clearFrameCheckTimer();
  }

  play() {
    this._video.play();
    this._videoRight.play();
    this._startFrameCheckTimer();
  }

  restart() {
    this._video.currentTime = 0;
    this._videoRight.currentTime = 0;
    this.stats = {'missLeft':0,'missRight':0};
    this._startFrameCheckTimer();
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
    // let time = performance.now()/1000;
    // this._video.currentTime = time;
    // this._videoRight.currentTime = time;
    if(!this._video.played || !this._videoRight.played) {
      return;
    }
    if(this._video.currentTime > this._videoRight.currentTime) {
      this._videoRight.currentTime = this._video.currentTime;
      this.stats.missRight += 1;
      
    } else if(this._video.currentTime < this._videoRight.currentTime) {
      this._video.currentTime = this._videoRight.currentTime;
      this._stats.missLeft += 1;
    }

  }

};

export {
    PWAVideoCtrl,
    PWASBSVideoCtrl
}