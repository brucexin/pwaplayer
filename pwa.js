class OriginVideoCtrl {
    constructor(videoId) {
      this.video = document.getElementById(videoId);
      this.width = 0;
      this.height = 0;
      this.ratio = 1.0;
      var self = this;
      this.video.addEventListener("loadedmetadata", (e) => {
        self.width = self.video.videoWidth;
        self.height = self.video.videoHeight;
        self.ratio = self.width/self.height;
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
      this.video.addEventListener("play", cb, false);
    }

    get paused() {
      return this.video.paused;
    }

    get ended() {
      return this.video.ended;
    }

    get played() {
      return this.video.played;
    }    

};

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

var processor = {
    timerCallback: function() {
      if (this.originVideoCtrl.paused || this.originVideoCtrl.ended) {
        return;
      }
      if(this.originVideoCtrl.played.length > 0) {
        this.computeFrame1();
      }
  
      var self = this;
      setTimeout(function () {
        self.timerCallback();
      }, 16); // roughly 60 frames per second
    },

    displayMessage : function (message, isError) {
      // console.log(message);
      var element = document.querySelector('#message')
      element.innerHTML = message
      element.className = isError ? 'error' : 'info'
    },
  
    doLoad: function() {
      this.originVideoCtrl = new OriginVideoCtrl("videoOrion");
      this.mainContainer = document.getElementById("divHandled");
      this.c1 = document.getElementById("canvasPicture");
      this.ctx1 = this.c1.getContext("2d");
      this.vdiv = document.getElementById("divOrigin");
      this.mode = "vr";
      //this.mode = "normal";
      var self = this;

      this.openDiv = document.getElementById("divVideoOpen");
      var fileOpenBtn = document.getElementById("btnOpen");
      var fileOpenInput = document.getElementById("fileVideoOpen");
      fileOpenBtn.addEventListener("click", (e) => {
        fileOpenInput.click();
      }, false);
  
      this.originVideoCtrl.onloaded(() => {
        console.log(`originVideoCtrl fired onloaded ${this.originVideoCtrl.width}`);
        this.originVideoCtrl.onplay(function() {
          console.log(`video width:${self.originVideoCtrl.width}`);
          console.log(`video canvas width:${self.c1.width}`);
          self.fitCanvasSize(self.originVideoCtrl.ratio, self.c1);
          self.timerCallback();
          self.openDiv.style.display = "none";
        });
      });
      
    },

    fitCanvasSize: function(ratio, canvasCtrl) {
      let width = canvasCtrl.clientWidth;
      let height = width/ratio;
      canvasCtrl.width = width;
      canvasCtrl.height = height;
    },

    computeFrame: function() {
      let imgWidth = this.originVideoCtrl.width/4;
      let imgHeight = this.originVideoCtrl.height/4;

      let x = (this.c1.clientWidth/2) - (this.originVideoCtrl.width/2)*this.scale;
      let y = (this.c1.clientHeight/2) - (this.originVideoCtrl.height/2)*this.scale;

      this.displayMessage(`src: ${this.originVideoCtrl.width*this.scale} ${this.originVideoCtrl.height*this.scale}, img width:${imgWidth} height ${imgHeight}, canvas ${this.c1.width} ${this.c1.height}`);
      this.ctx1.drawImage(this.originVideoCtrl.video, 
         0, 0, this.c1.width, this.c1.height)
      // var frame = this.c1.getImageData(0, 0, this.width, this.height);
      // var l = frame.data.length / 4;
      // const length = frame.data.length;
  
      // for (let i = 0; i < length; i += 4) {
      //   frame.data[i * 4 + 0] = grey;
      //   frame.data[i * 4 + 1] = grey;
      //   frame.data[i * 4 + 2] = grey;
      // }
      // this.c1.putImageData(frame, 0, 0);
  
    },
  
    computeFrame1: function() {
      let imgWidth = this.c1.clientWidth;
      let imgHeight = imgWidth/this.originVideoCtrl.ratio;
      this.displayMessage(`img width:${imgWidth}, height ${imgHeight}`);
      if(this.mode == "vr") {
        imgWidth /= 2;
        imgHeight /= 2;
        createImageBitmap(this.originVideoCtrl.video, {
          resizeWidth: imgWidth,
          resizeHeight: imgHeight,
          resizeQuality: 'high'
        }).then((img) => {
            this.ctx1.drawImage(img, 0, 0, img.width, img.height);
            this.ctx1.drawImage(img, img.width, 0, img.width, img.height);
        });
      } else {
          this.ctx1.drawImage(this.originVideoCtrl.video, 0, 0, imgWidth, imgHeight);
      }
      
      /*var frame = this.ctx1.getImageData(0, 0, this.width, this.height);*/
      //var l = frame.data.length / 4;
  
        //frame.data[i * 4 + 0] = grey;
        //frame.data[i * 4 + 1] = grey;
        //frame.data[i * 4 + 2] = grey;
      //}
      //this.ctx1.putImageData(frame, 0, 0);
  
      return;
    }
  };
  
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
    localFileVideoPlayer();
  });
  