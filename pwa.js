class PWAVideoCtrl {
    constructor(video) {
      this._video = video;
      this.width = 0;
      this.height = 0;
      this.ratio = null;
      var self = this;
      this._video.addEventListener("loadedmetadata", (e) => {
        self.width = self._video.videoWidth;
        self.height = self._video.videoHeight;
        self.ratio = self.height/self.width;
        if(self.loadedCB) {
          self.loadedCB();
        }
      });

      // this.elem.addEventListener("loadeddata", (e) => {
      //   self.width = self.elem.videoWidth;
      //   self.height = self.elem.videoHeight;
      //   console.log(`loadeddata fired! ${self.width} ${self.height}`);
      // });
    }
    onloaded(cb) {
      this.loadedCB = cb;
    }
    onplay(cb) {
      this._video.addEventListener("play", cb, false);
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

    set muted(value) {
      this._video.muted = value;
    }

    get volume() {
      return this._video.volume;
    }
  
    set volume(value) {
      this._video.volume = value;
    }

    canPlay(file) {
      var type = file.type;
      var canPlay = this._video.canPlayType(type);
      if (canPlay === '') {
        return false;
      }
      return true;
    }

    playLocalFile(file) {
      var URL = window.URL || window.webkitURL;
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

class PWASBSVideoCtrl {
  constructor(videoLeft, videoRight) {
    this._videoLeft = videoLeft;
    this._videoRight = videoRight;
    // this._vttTrackLeft = this._getVTTElement(videoLeft);
    // this._vttTrackLeft.mode = "hidden";
    // this._vttTrackRight = this._getVTTElement(videoRight);
    // this._vttTrackRight.mode = "hidden";
    this._mediaTimeLeft = null;
    this._mediaTimeRight = null;
    this.width = 0;
    this.height = 0;
    this.ratio = null;
    var self = this;
    this._videoLeft.addEventListener("loadedmetadata", (e) => {
      self.width = self._videoLeft.videoWidth;
      self.height = self._videoLeft.videoHeight;
      self.ratio = self.height/self.width;
      console.log(`loadedmetadata ${self._videoLeft.videoWidth}`);
      if(self.loadedCB) {
        self.loadedCB();
      }
    });

    this._videoLeft.addEventListener("ended", (e) => {
      this._clearFrameCheckTimer();
    });

    this._videoRight.addEventListener("loadedmetadata", (e) => {
      console.log(`loadedmetadata right ${self._videoRight.videoWidth}`);
    });
    
    this._videoLeft.requestVideoFrameCallback((time, metadata) => {
        self._onFrameCallback(self._videoLeft, time, metadata);
    });

    this._videoRight.requestVideoFrameCallback((time, metadata) => {
      self._onFrameCallback(self._videoRight, time, metadata);
    });

    // this._vttTrackLeft.addEventListener("load", () => {
    //   console.log(`vttLeft loaded:${this.src}`);
    //   this.mode = "showing";
    // });

    // this._vttTrackRight.addEventListener("load", () => {
    //   console.log(`vttRight loaded:${this.src}`);
    //   this.mode = "showing";
    // });
   
    
  }

  _onFrameCallback(video, time, metadata) {
    if(video == this._videoLeft) {
      this._mediaTimeLeft = metadata.mediaTime;
    } else {
      this._mediaTimeRight = metadata.mediaTime;
    }
  }

  _startFrameCheckTimer() {
    if(!this._frameCheckTimer) {
      this._frameCheckTimer = setInterval(() => {
        if(this._mediaTimeLeft != this._mediaTimeRight) {
          console.log(`SBS mismatch: ${this._mediaTimeLeft} != ${this._mediaTimeRight}`);
        }
      }, 10);
    }
  }

  _clearFrameCheckTimer() {
    if(this._frameCheckTimer) {
      clearInterval(this._frameCheckTimer);
      this._frameCheckTimer = null;
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

  onloaded(cb) {
    this.loadedCB = cb;
  }
  onplay(cb) {
    this._videoLeft.addEventListener("play", cb, false);
  }

  get paused() {
    return this._videoLeft.paused;
  }

  get ended() {
    return this._videoLeft.ended;
  }

  get played() {
    return this._videoLeft.played;
  }    

  get currentTime() {
    return this._videoLeft.currentTime;
  }

  get duration() {
    return this._videoLeft.duration;
  }

  get src() {
    return this._videoLeft.src;
  }

  get muted() {
    return this._videoLeft.muted;
  }

  set muted(value) {
    this._videoLeft.muted = value;
    this._videoRight.muted = value;
  }

  get volume() {
    return this._videoLeft.volume;
  }

  set volume(value) {
    this._videoLeft.volume = value;
    this._videoRight.volume = value;
  }

  canPlay(file) {
    var type = file.type;
    var canPlay = this._videoLeft.canPlayType(type);
    if (canPlay === '') {
      return false;
    }
    return true;
  }

  playLocalFile(file) {
    var URL = window.URL || window.webkitURL;
    var fileURL = URL.createObjectURL(file);
    this._videoLeft.src = fileURL;
    this._videoRight.src = fileURL;
    this._videoLeft.play();
    this._videoRight.play();
    this._startFrameCheckTimer();
    return true;
  }

  playSource(src, playAtTime) {
    this._videoLeft.src = src;
    this._videoRight.src = src;
    if(playAtTime) {
      this._videoLeft.currentTime = playAtTime;
      this._videoRight.currentTime = playAtTime;
    }
    this._videoLeft.play();
    this._videoRight.play();
    this._startFrameCheckTimer();
    return true;
  }

  pause() {
    this._videoLeft.pause();
    this._videoRight.pause();
    this._clearFrameCheckTimer();
  }

  play() {
    this._videoLeft.play();
    this._videoRight.play();
    this._startFrameCheckTimer();
  }

  restart() {
    this._videoLeft.currentTime = 0;
    this._videoRight.currentTime = 0;
    this._startFrameCheckTimer();
  }

  seekTo(newTime) {
    this._videoLeft.currentTime = newTime;
    this._videoRight.currentTime = newTime;
  }

  setVTT(vttFile) {
    var URL = window.URL || window.webkitURL;
    var fileURL = URL.createObjectURL(vttFile);
    console.log(`set vtt ${fileURL}`);

    this._createVTTElement(this._videoLeft, fileURL);
    this._createVTTElement(this._videoRight, fileURL);
    
    // this._videoLeft.appendChild(track);
    // this._videoRight.appendChild(track);

    // this._vttTrackLeft.src = fileURL;
    // this._vttTrackRight.src = fileURL;
  }

};

class BaseUI {
  constructor(elementId) {
    this._em = elementId;
    this.panel = document.getElementById(elementId);
    this._emDisplay = this.panel.style.display;
    if(this._emDisplay == 'none') {
      this.displayed = false;
    } else {
      this.displayed = true;
    }
  }

  show() {
    this.panel.style.display = this._emDisplay;
    this.displayed = true;
  }

  hide() {
    this.panel.style.display = 'none';
    this.displayed = false;
  }
}
class PWAPlayerUI extends BaseUI {
  constructor(panelHTMLId, videoHTMLId) {
    super(panelHTMLId);
    this.ctrl = new PWAVideoCtrl(document.getElementById(videoHTMLId));
    
  }
}

class PWASBSPlayerUI extends BaseUI {
  constructor(panelHTMLId, sbsLeftHTMLId, sbsRightHTMLId) {
    super(panelHTMLId);
    this._videoLeft = document.getElementById(sbsLeftHTMLId);
    this._videoRight = document.getElementById(sbsRightHTMLId)
    this.ctrl = new PWASBSVideoCtrl(this._videoLeft, this._videoRight);
    this._originWidth = '50%';
    this._originHeight = '28.125vw';
    console.log(`origin size: ${this._originWidth} ${this._originHeight}`);
  }

  setViewSize(newWidth) {
    let widthStr = `${newWidth * 100}%`;
    let heightStr = null;
    if(this.ctrl.ratio) {
      heightStr = `${newWidth*100*this.ctrl.ratio}vw`;
    } else {
      console.log(`origin height ${this._originHeight}`);
      let r = this._originHeight.match(new RegExp('([0-9]+[.][0-9]+)vw'));
      let value = r[1];
      let heightByVW = parseFloat(value);
      let widthRatio = newWidth/0.5;
      console.log(`heightByVW ${heightByVW}`);
      let newHeight = heightByVW*widthRatio;
      heightStr = `${newHeight}vw`;
    }
    
    console.log(`setViewSize ${widthStr} ${heightStr}`);
    this._videoLeft.style.width = widthStr;
    this._videoLeft.style.height = heightStr;
    this._videoRight.style.width = widthStr;
    this._videoRight.style.height = heightStr;
  }

  setViewHoriPosition(horiValue) {
    let pos = horiValue * 2.5;
    this._videoLeft.style.marginRight = `${pos}vw`;
    this._videoRight.style.marginLeft = `${pos}vw`;
  }

  setViewVeriPosition(veriValue) {
    let pos = veriValue - 5;
    let marginTop = 0;
    let marginBottom = 0;
    if(pos > 0) {
      marginTop = pos*5;
      
    } else {
      marginBottom = -pos*5;
    }
    let topStr = `${marginTop}vh`;
    let bottomStr = `${marginBottom}vh`
    console.log(`veri ${topStr} ${bottomStr}`);
    this.panel.style.marginTop = topStr;
    this.panel.style.marginBottom = bottomStr;
  }
}


// const PLAY_STATE_NOTSELECT = Symbol("not select video file");
// const PLAY_STATE_NOTSTART = Symbol("selected video file but wait loading first frame");
// const PLAY_STATE_PLAYING = Symbol("Playing video");
// const PLAY_STATE_PAUSED = Symbol("Play alread be paused");
// const PLAY_STATE_ENDED = Symbol("Play already ended or be stopped");
// class PlayerControls {
//   constructor(controls) {
//     this.playState = PLAY_STATE_NOTSTART;
//     this.playerUI = controls.playerUI ;
//     this.video = null;
//     this.progressBar = null;
//     this.progressTime = null;
//     this.seekerSlider = null;
//     this.playBtn = controls.playBtn;
//     this.pauseBtn = controls.pauseBtn;
//     this.openFileBtn = controls.openFileBtn;
//     this.restartBtn = controls.restartBtn;
//     this.fullscreenBtn = controls.fullscreenBtn;
//     this.fullscreenExitBtn = controls.fullscreenExitBtn;
//     this.vrModeBtn = controls.vrModeBtn;
//     this.normalModeBtn = controls.normalModeBtn;
//   }

//   hideCtrl(htmlElement) {
//     htmlElement.style.display = "none";
//   }
//   showCtrl(htmlElement) {
//     htmlElement.style.display = "block"
//   }

//   update() {
//     if(this.playState == PLAY_STATE_NOTSELECT) {
//       this.hideCtrl(this.playBtn);

//     }
//   }

// };

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

const MODE_NORMAL = Symbol("normal")
const MODE_SBS = Symbol("sbs");
var processor = {
    timerCallback: function() {
      if (this.videoCtrl.paused || this.videoCtrl.ended) {
        return;
      }
      if(this.videoCtrl.played.length > 0) {
        this.computeFrame1();
      }
  
      var self = this;
      setTimeout(function () {
        self.timerCallback();
      }, 16); // roughly 60 frames per second
    },

    progressTimerCallback: function() {
      let playedSecs = Math.ceil(this.videoCtrl.currentTime);
      let durationSecs = Math.ceil(this.videoCtrl.duration);
      // console.log(`progress ${playedSecs}/${durationSecs}`);
      let currTimeStr = secondsToHMS(playedSecs);
      let totalTimeStr = secondsToHMS(durationSecs);
      this.currTimeCtrl.innerHTML = currTimeStr;
      this.totalTimeCtrl.innerHTML = totalTimeStr;
      this.progressCtrl.value = `${playedSecs}`;
      var self = this;
      setTimeout(function () {
        self.progressTimerCallback();
      }, 1000); // update progress per second
    },
    hoverProgressCtr: function(evt) {
      let durationSecs = Math.ceil(this.videoCtrl.duration);
      let maxVal = this.progressCtrl.clientWidth;
      let pointedTime = Math.round(durationSecs*(evt.offsetX/maxVal));
      let timestr = secondsToHMS(pointedTime);
      let rect = this.progressCtrl.getBoundingClientRect();
      // console.log(`rect ${rect.top} ${rect.left}, time ${pointedTime}/${durationSecs}`);
      let timeLabel = document.getElementById('divPopPlayTime');
      let timeLabelRect = timeLabel.getBoundingClientRect();
      // console.log(`rect ${timeLabelRect.x} ${timeLabelRect.y} ${timeLabelRect.width} ${timeLabelRect.height}`);
      timeLabel.style.left = evt.x + "px";
      timeLabel.style.top = (rect.top - timeLabelRect.height) + "px";
      timeLabel.innerHTML = timestr;
      //timeLabel.style.display = "inline" ;
      //timeLabel.style.position = "absolute";
      timeLabel.style.visibility = 'visible';

    },
    changeTimeByProgressClick : function(evt) {
      let durationSecs = Math.ceil(this.videoCtrl.duration);
      let maxVal = this.progressCtrl.clientWidth;
      let pointedTime = Math.round(durationSecs*(evt.offsetX/maxVal));
      this.videoCtrl.seekTo(pointedTime);
    },
    endHoverProgressCtr : function(evt) {
      let timeLabel = document.getElementById('divPopPlayTime');
      //timeLabel.style.display = 'none';
      timeLabel.style.visibility = 'hidden';
    },
    changeSBSViewSize: function(evt) {
      // let widthMax = 0.5;
      let width = evt.target.value * 0.05; // max is 0.5
      this.sbsPlayerUI.setViewSize(width);
    },
    changeSBSHoriPosition: function(evt) {
      this.sbsPlayerUI.setViewHoriPosition(evt.target.value);
    },
    changeSBSVeriPosition: function(evt) {
      this.sbsPlayerUI.setViewVeriPosition(evt.target.value);
    },

    displayMessage : function (message, isError) {
      // console.log(message);
      var element = document.querySelector('#message')
      element.innerHTML = message
      element.className = isError ? 'error' : 'info'
    },

    switchMode : function() {
      let newVideoCtrl = null;
      if(this.mode == MODE_NORMAL) {
        this.sbsPlayerUI.hide();
        this.normalPlayerUI.show();
        newVideoCtrl = this.normalPlayerUI.ctrl;
      } else {
        this.sbsPlayerUI.show();
        this.normalPlayerUI.hide();
        newVideoCtrl = this.sbsPlayerUI.ctrl;
      }
      if(this.videoCtrl != null) {
        this.videoCtrl.pause();
        let src = this.videoCtrl.src;
        let playAtTime = this.videoCtrl.currentTime;
        this.videoCtrl = newVideoCtrl;
        if(src) {
          this.videoCtrl.playSource(src, playAtTime);
        }
      } else {
        this.videoCtrl = newVideoCtrl;
      }
      
    },

    handlePlay : function() {
      if(this.videoCtrl.ratio == null) {
        return;
      }
      let self = this;
      console.log(`video size:${self.videoCtrl.width},${self.videoCtrl.height} ratio: ${self.videoCtrl.ratio}`);
      // console.log(`video canvas width:${self.c1.width}`);
      // self.fitCanvasSize(self.videoCtrl.ratio, self.c1);
      // console.log(`canvas:${self.c1.clientWidth} ${self.c1.clientHeight}`);
      self.progressCtrl.max = Math.round(self.videoCtrl.duration);
      self.progressCtrl.addEventListener('mousemove', (evt) => {
        self.hoverProgressCtr(evt);
      });
      self.progressCtrl.addEventListener('mouseleave', (evt) => {
        self.endHoverProgressCtr(evt);
      });
      self.progressCtrl.addEventListener('click', (evt) => {
        self.changeTimeByProgressClick(evt);
      });
      self.progressTimerCallback();

      self.volumeRange.value = self.videoCtrl.volume*100;

      
      
      // self.timerCallback();
      // self.openDiv.style.display = "none";
      self.openDiv.style.visibility = "hidden";
      self.toolbarCtrl.style.visibility = "hidden";
      
      self.toolbarCtrl.addEventListener('mouseleave', () => {
        self.toolbarCtrl.style.visibility = "hidden";
        self.openDiv.style.visibility = "hidden";
      });

      this.started = true;
    },
  
    doLoad: function() {
      this.videoCtrl = null;
      this.src = null;
      // this.mainContainer = document.getElementById("divHandled");
     
      this.normalPlayerUI = new PWAPlayerUI("divOrigin", "videoOrion");
      this.sbsPlayerUI = new PWASBSPlayerUI("divSBS", "videoLeft", "videoRight");
      this.mode = MODE_SBS;
      this.started = false;

      this.toolbarCtrl = document.getElementById("divToolbar");
      this.progressCtrl = document.getElementById("divProgress");
      this.totalTimeCtrl = document.getElementById("labelTotalTime");
      this.currTimeCtrl = document.getElementById("labelCurrTime");
      this.mode = "normal";
      var self = this;

      this.openDiv = document.getElementById("divVideoOpen");
      var fileOpenBtn = document.getElementById("btnOpen");
      var fileOpenInput = document.getElementById("fileVideoOpen");
      var playBtn = document.getElementById("btnPlay");
      var pauseBtn = document.getElementById("btnPause");
      var restartBtn = document.getElementById("btnRestart");
      var vrBtn = document.getElementById("btnVR");
      var normalBtn = document.getElementById("btnNormal");
      this.volumeOnBtn = document.getElementById("btnVolumeOn");
      this.volumeMuteBtn = document.getElementById("btnVolumeMute");
      this.volumeRange = document.getElementById("rangeVolume");
      var vttBtn = document.getElementById("btnVTT");
      var vttOpenInput = document.getElementById("fileVTTOpen");

      this.sbsViewCtrl = document.getElementById("divSBSView");
      var sbsViewSizeRange = document.getElementById("rangeSBSViewSize");
      var sbsViewHoriPosRange = document.getElementById("rangeSBSHPos");
      var sbsViewVeriPosRange = document.getElementById("rangeSBSVPos");
      

      fileOpenInput.addEventListener('change', (evt) => {
        self.files = fileOpenInput.files;
        self.playSelectedFile(evt);
      }, false);
      fileOpenBtn.addEventListener("click", (e) => {
        fileOpenInput.click();
      }, false);
      playBtn.addEventListener("click", () => {
        if(self.videoCtrl) {
          self.videoCtrl.play();
        }
      });
      pauseBtn.addEventListener("click", () => {
        if(self.videoCtrl) {
          self.videoCtrl.pause();
        }
      });
      restartBtn.addEventListener("click", () => {
        if(self.videoCtrl) {
          self.videoCtrl.restart();
        }
      });
      vrBtn.addEventListener("click", () => {
        if(self.videoCtrl && self.mode != MODE_SBS) {
          self.mode = MODE_SBS;
          self.switchMode();
        }
      });
      normalBtn.addEventListener("click", () => {
        if(self.videoCtrl && self.mode != MODE_NORMAL) {
          self.mode = MODE_NORMAL;
          self.switchMode();
        }
      });
      this.volumeOnBtn.addEventListener("click", () => {
        self.volumeMuteBtn.style.display = "inline";
        self.volumeOnBtn.style.display = "none";
        if(self.videoCtrl) {
          self.videoCtrl.muted = false;
        }
      });
      this.volumeMuteBtn.addEventListener("click", () => {
        self.volumeMuteBtn.style.display = "none";
        self.volumeOnBtn.style.display = "inline";
        if(self.videoCtrl) {
          self.videoCtrl.muted = true;
        }
      });
      this.volumeRange.addEventListener("change", (evt) => {
        console.log(`volume change to ${evt.target.value}`);
        if(self.videoCtrl) {
          self.videoCtrl.volume = evt.target.value/100;
        }
      });
      vttOpenInput.addEventListener('change', (evt) => {
        if(vttOpenInput.files.length > 0) {
          self.vttFiles = vttOpenInput.files;
          self.videoCtrl.setVTT(self.vttFiles[0]);
        }
      }, false);
      vttBtn.addEventListener("click", () => {
        vttOpenInput.click();
      });
      sbsViewSizeRange.addEventListener("change", (evt) => {
        self.changeSBSViewSize(evt);
      });
      sbsViewHoriPosRange.addEventListener("change", (evt) => {
        self.changeSBSHoriPosition(evt);
      });
      sbsViewVeriPosRange.addEventListener("change", (evt) => {
        self.changeSBSVeriPosition(evt);
      });

      // window.onresize = (evt) => {
      //   self.fitCanvasSize();
      // };
      this.switchMode();
      this.autoHiddenToolbarTimer = null;
      this.toolbarClicked = false;
      window.addEventListener('click', (evt) => {
        if(!self.started) {
          return;
        }
        if(this.autoHiddenToolbarTimer) {
          this.toolbarClicked = true;
        } else {
          self.openDiv.style.visibility = "visible";
          self.toolbarCtrl.style.visibility = "visible";
          this.autoHiddenToolbarTimer = setInterval(() => {
            if(self.toolbarCtrl.style.visibility == "visible"
               && !this.toolbarClicked) {
                self.openDiv.style.visibility = "hidden";
                self.toolbarCtrl.style.visibility = "hidden";
                clearInterval(this.autoHiddenToolbarTimer);
                this.autoHiddenToolbarTimer = null;
            }  else if(self.toolbarCtrl.style.visibility == "hidden") {
              clearInterval(this.autoHiddenToolbarTimer);
              this.autoHiddenToolbarTimer = null;
            }
            this.toolbarClicked = false; //clear state, wait next timeout
          }, 2000);
        }
      });
    },

    fitCanvasSize: function(ratio, canvasCtrl) {
      console.log(`canvas size of style: ${canvasCtrl.style.width} ${canvasCtrl.style.height}`);
      let width = canvasCtrl.clientWidth;
      let height = width*ratio;
      canvasCtrl.width = width;
      canvasCtrl.height = height;
      canvasCtrl.style.height = (ratio*100) + 'vw';
    },
  
    computeFrame: function() {
      let imgWidth = this.c1.width;
      let imgHeight = imgWidth*this.videoCtrl.ratio;
      
      if(this.mode == "vr") {
        imgWidth /= 2;
        imgHeight /= 2;
        createImageBitmap(this.videoCtrl.video, {
          resizeWidth: imgWidth,
          resizeHeight: imgHeight,
          resizeQuality: 'high'
        }).then((img) => {
          this.displayMessage(`img width:${img.width}, height ${img.height}, \
        canvas width: ${this.c1.width}, height ${this.c1.height}`);
            this.ctx1.drawImage(img, 0, 0, img.width, img.height);
            // this.ctx1.drawImage(img, img.width, 0, img.width, img.height);
            this.ctx1.rect(0, 0, img.width, img.height+10);
            this.ctx1.rect(img.width, 0, img.width, img.height+10);
            this.ctx1.lineWidth = 5;
            this.ctx1.stroke();
        });
      } else {
          this.ctx1.drawImage(this.videoCtrl.video, 0, 0, imgWidth, imgHeight);
      }
      
      /*var frame = this.ctx1.getImageData(0, 0, this.width, this.height);*/
      //var l = frame.data.length / 4;
  
        //frame.data[i * 4 + 0] = grey;
        //frame.data[i * 4 + 1] = grey;
        //frame.data[i * 4 + 2] = grey;
      //}
      //this.ctx1.putImageData(frame, 0, 0);
  
      return;
    },

    playSelectedFile(files) {
      if(this.files.length == 0) {
        return;
      }
      var file = this.files[0];
      if(this.videoCtrl.canPlay(file)) {
        let self = this;
        this.videoCtrl.onplay((evt) => {
          self.handlePlay(evt);
        });
        this.videoCtrl.onloaded((evt) => {
          console.log('on loaded');
          self.handlePlay(evt);
        });
        this.videoCtrl.playLocalFile(file);
      } else {
        this.displayMessage(`Can't play video ${file}`);
      }
    }
  }; /* end var processor */
   
  
  document.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOM loaded!');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then((reg) => {
          console.log('Service worker registered -->', reg);
        }, (err) => {
          console.error('Service worker not registered -->', err);
        });
    }
    processor.doLoad();
  });
  