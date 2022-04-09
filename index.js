import {addWord, removeWord, hasWord, secondsToHMS, SimpleDebouncer,
    parseFloatWithDefault} from './lib/utils.js';
import { SharePlaceGroup } from "./lib/ui_share_place.js";
import {DOCK_TYPE, showPopup, hidePopup} from "./lib/ui_popup.js";
import {PWAVideoCtrl, PWASBSVideoCtrl, VIDEOCTRL_ASPECT_RATIO_EVENT} from "./lib/video_ctrl.js"

var URL = window.URL || window.webkitURL;

class PopupGroup {
    constructor() {
        this.dialogs = new Map();
    }

    add(elementPopup, elementDock, dockType) {
        if(!elementDock.id) {
            throw new Error("elementDock missing Id!");
        }
        this.dialogs.set(elementPopup.id, {'did':elementDock.id, 'dt':dockType, 'showed':false});
    }

    remove(elementPopup) {
        this.dialogs.delete(elementPopup.id);

    }

    showed(elementPopup) {
        return this.dialogs.get(elementPopup.id).showed;
    }

    show(elementPopup, referenceX, referenceY) {
        this.hideAll();
        let params = this.dialogs.get(elementPopup.id);
        let el = document.getElementById(elementPopup.id);
        let docker = document.getElementById(params.did);
        showPopup(el, docker, params.dt, referenceX, referenceY);
        params.showed = true;
    }

    hide(elementPopup) {
        let params = this.dialogs.get(elementPopup.id);
        hidePopup(elementPopup);
        params.showed = false;
    }

    hideAll() {
        for(let item of this.dialogs) {
            let params = item[1];
            let el = document.getElementById(item[0]);
            hidePopup(el);
            params.showed = false;
        }
    }

    toggle(elementPopup, referenceX, referenceY) {
        if(this.showed(elementPopup)) {
            this.hide(elementPopup);
        } else {
            this.show(elementPopup, referenceX, referenceY);
        }
    }
}

class Page {
    constructor(pageElement, hiddenStyleCSS) {
        this._hiddenCSS = hiddenStyleCSS;
        this.page = pageElement;
        this.id = pageElement.id;
        this.isActive = !hasWord(this.page.className, this._hiddenCSS);
    }

    active() {
        this.activeElement(this.page);
        
        this.isActive = true;
    }

    hide() {
        this.hideElement(this.page);
        this.isActive = false;
    }

    isActive() {
        return this.hidded;
    }

    hideElement(el) {
        if(!hasWord(this._hiddenCSS, el.className)) {
            el.className = addWord(this._hiddenCSS, el.className);
        }
    }

    activeElement(el) {
        if(hasWord(this._hiddenCSS, el.className)) {
            el.className = removeWord(this._hiddenCSS, el.className);
        }
    }
}

let VIDEO_SOURCE_CHANGE_EVENT = "video_source_change";

class MainUI extends Page {
    constructor() {
        super(document.getElementById("page-main"), 'hidden-display');
        this._hiddenCSS = 'hidden-display';
        this.initOpenFileControls();
        this.initOpenURLControls();
    }

    initOpenFileControls() {
        this.btnOpenFile = document.getElementById('btn-open-file');
        this.inputFileSelect = document.getElementById('input-video-file');
        this.btnOpenFile.addEventListener('click', () => {
            // pageMgr.activePage('page-player');
            this.hideElement(this.divInputURL);
            this.inputFileSelect.click();
        });
        this.inputFileSelect.addEventListener('change', () => {
            if(this.inputFileSelect.files.length > 0) {
                pageMgr.activePage('page-player');
                this.triggerVideoFileSourceEvent();
            }
        });
    }

    initOpenURLControls() {
        this.btnOpenURL = document.getElementById('btn-open-url');
        this.divInputURL = document.getElementById('div-url');
        this.btnURLInputSubmit = document.getElementById('btn-url-submit');

        this.btnOpenURL.addEventListener('click', () => {
            this.activeElement(this.divInputURL);
        })
    }

    triggerVideoFileSourceEvent() {
        let event = new CustomEvent(VIDEO_SOURCE_CHANGE_EVENT, 
            {detail: {files: this.inputFileSelect.files}}
        );
        console.log('trigger video file event');
        document.dispatchEvent(event);
        this.inputFileSelect.value = '';
    }
    
}

class PlayerUI extends Page {
    MODE_NORMAL = 'normal';
    MODE_SBS = 'sbs';
    constructor() {
        super(document.getElementById("page-player"), 'hidden-display');
        this.playControls = document.getElementById('div-play-controls');
        this.controlsShowed = false;

        this.resizeDebouncer = new SimpleDebouncer(this._onResize.bind(this), 500);
        this.boundDebouncerCall = this.resizeDebouncer.call.bind(this.resizeDebouncer);

       this.popupGroup = new PopupGroup();

       this.initVideo();

       this.initFullscreenButtons();
       this.initViewModeButtons();
       this.initVolumeButtons();
       this.initPlayButtons();
       this.initVTTCtrls();
       this.initProgressCtrls();
       this.initBackButton();
    }

    active() {
        super.active();
        this.enterFullscreen();
        
        this.hideControls();
        this.beginUpdateProgress();

        window.addEventListener('resize', this.boundDebouncerCall);
    }

    hide() {
        window.removeEventListener('resize', this.boundDebouncerCall);
        super.hide();
        if(document.fullscreenElement) {
            document.exitFullscreen();
            screen.orientation.unlock();
        }
        this.hideControls();
        if(!this.videoCtrl.ended) {
            this.videoCtrl.pause();
            
        }
        this.stopUpdateProgress();
    }

    showControls() {
        this.activeElement(this.btnBack);
        this.activeElement(this.playControls);
        this.controlsShowed = true;
    }

    hideControls() {
        this.hideElement(this.btnBack);
        this.hideElement(this.playControls);
        this.controlsShowed = false;
    }

    initFullscreenButtons() {
        this.btnFullscreen = document.getElementById('btn-fullscreen');
        this.btnFullscreenExit = document.getElementById('btn-fullscreen-exit');
        this.spFullscreen = new SharePlaceGroup([this.btnFullscreen, this.btnFullscreenExit], "hidden-display");

        this.spFullscreen.disableAll()
        this.spFullscreen.updateTo(this.btnFullscreen);

        this.btnFullscreen.addEventListener('click', () => {
            // this.spFullscreen.updateTo(this.btnFullscreenExit);
            this.enterFullscreen();
        })

        this.btnFullscreenExit.addEventListener('click', () => {
            // this.spFullscreen.updateTo(this.btnFullscreen);
            this.exitFullscreen();
        })
    }

    enterFullscreen() {
        document.documentElement.requestFullscreen().then(() => {
            screen.orientation.lock('landscape');
            this.spFullscreen.updateTo(this.btnFullscreenExit);
            console.log('window: ', window.innerWidth, window.innerHeight);
            console.log('screen: ', window.screen.width, window.screen.height);
            console.log('devicePR:', window.devicePixelRatio);
        }).catch((err) => {
            this.spFullscreen.updateTo(this.btnFullscreen);
            console.log('requestFullscreen failed: ', err);
        });
    }

    exitFullscreen() {
        document.exitFullscreen().then(() => {
            this.spFullscreen.updateTo(this.btnFullscreen);
        }).catch((err) => {
            console.log('exitFullscreen failed: ', err);
        });
    }

    initViewModeButtons() {
        this.btnVRMode = document.getElementById('btn-vr-mode');
        this.btnNormalMode = document.getElementById('btn-normal-mode');
        this.btnSettings = document.getElementById('btn-settings');
        this.popupSettings = document.getElementById('div-popup-settings');
        this.spViewMode = new SharePlaceGroup([this.btnVRMode, this.btnNormalMode], "hidden-display");

        this.spViewMode.disableAll()
        this.spViewMode.updateTo(this.btnVRMode);

        this.btnVRMode.addEventListener('click', () => {
            this.spViewMode.updateTo(this.btnNormalMode);
            this.switchMode(this.MODE_SBS);
        })

        this.btnNormalMode.addEventListener('click', () => {
            this.spViewMode.updateTo(this.btnVRMode);
            this.switchMode(this.MODE_NORMAL);
        })

        this.popupGroup.add(this.popupSettings, this.playControls, DOCK_TYPE.BOTTOM_TOP);

        this.btnSettings.addEventListener('click', () => {
            let x = this.btnSettings.getBoundingClientRect().x - this.popupSettings.getBoundingClientRect().width/2;
            this.popupGroup.toggle(this.popupSettings, x, -5);
        })
    }

    initVolumeButtons() {
        this.btnMute = document.getElementById('btn-mute');
        this.btnVolumeOpen = document.getElementById('btn-volume-open');
        this.rangeVolume = document.getElementById('range-volume');
        this.spVolume = new SharePlaceGroup([this.btnMute, this.btnVolumeOpen], "hidden-display");

        this.spVolume.disableAll()
        this.spVolume.updateTo(this.btnMute);

        this.rangeVolume.value = this.videoCtrl.volume*100;

        this.btnMute.addEventListener('click', () => {
            this.spVolume.updateTo(this.btnVolumeOpen);
            this.rangeVolume.disabled="disabled";
            this.videoCtrl.muted = true;
        })

        this.btnVolumeOpen.addEventListener('click', () => {
            this.spVolume.updateTo(this.btnMute);
            this.rangeVolume.disabled="";
            this.videoCtrl.muted = false;
        })

        this.rangeVolume.addEventListener("change", (evt) => {
            console.log(`volume change to ${evt.target.value}`);
            this.videoCtrl.volume = evt.target.value/100;
        });
    }

    initPlayButtons() {
        this.btnPlay = document.getElementById('btn-play');
        this.btnPause = document.getElementById('btn-pause');
        this.spPlay = new SharePlaceGroup([this.btnPlay, this.btnPause], "hidden-display");
        this.userPlayed = false;
        this.userPaused = false;

        this.spPlay.disableAll()
        this.spPlay.updateTo(this.btnPlay);

        this.btnPlay.addEventListener('click', () => {
            this.spPlay.updateTo(this.btnPause);
            this.videoCtrl.play();
            this.userPlayed = true;
        })

        this.btnPause.addEventListener('click', () => {
            this.spPlay.updateTo(this.btnPlay);
            this.videoCtrl.pause();
            this.userPaused = true;
        })

        this.btnPlayRate = document.getElementById('btn-playrate');
        this.popupPlayrate = document.getElementById('div-popup-playrate');
        this.radioPlayRates = document.getElementsByName('radio-playrate');
       
        this.popupGroup.add(this.popupPlayrate, this.playControls, DOCK_TYPE.BOTTOM_TOP);
        this.btnPlayRate.addEventListener("click", () => {
            let x = this.btnPlayRate.getBoundingClientRect().x;
            for(let el of this.radioPlayRates) {
                if(el.value == this.btnPlayRate.innerText) {
                    el.checked = true;
                }
            }
            this.popupGroup.toggle(this.popupPlayrate, x, -1);
        });
        this.radioPlayRates.forEach((el) => {
            el.addEventListener('click', (evt) => {
                this.btnPlayRate.innerText = evt.target.value;
                this.popupGroup.hide(this.popupPlayrate);
                console.log('video playrate is ', this.videoCtrl.playbackRate);
                let playbackRate = Number.parseFloat(evt.target.value.substr(0, evt.target.value.length));
                console.log(`playrate changeto ${playbackRate}`);
                this.videoCtrl.playbackRate = playbackRate;
            });
        });

        this.videoCtrl.addEventListener('play', () => {
            if(this.spPlay.currentElement != this.btnPause) {
                this.spPlay.updateTo(this.btnPause);
            }
        })

        this.videoCtrl.addEventListener('pause', () => {
            if(this.spPlay.currentElement != this.btnPlay) {
                this.spPlay.updateTo(this.btnPlay);
            }
        })
    }

    initVTTCtrls() {
        this.inputVTTFileSelect = document.getElementById('input-subtitle-file');
        this.btnCaption = document.getElementById('btn-caption');

        this.btnCaption.addEventListener('click', () => {
            this.inputVTTFileSelect.click();
        });
        this.inputVTTFileSelect.addEventListener('change', () => {
            console.log('setVTT ', this.inputVTTFileSelect.files);
            if(this.inputVTTFileSelect.files.length > 0) {
                console.log('setVTT ', this.inputVTTFileSelect.files[0]);
                this.videoCtrl.clearVTT();
                this.videoCtrl.setVTT(this.inputVTTFileSelect.files[0]);
            }
            this.inputVTTFileSelect.value = '';
        });
    }

    initProgressCtrls() {
        this.rangeProgress = document.getElementById('range-progress');
        this.popupPlayTime = document.getElementById('div-popup-playtime');
        this.textTimeElapsed = document.getElementById('text-time-elapsed');
        this.textTimeTotal = document.getElementById('text-time-total');

        this.rangeProgress.addEventListener('mousemove', (evt) => {
            let pointedTime = this.calculateProgressByPoint(evt);
            let timestr = secondsToHMS(pointedTime);
            this.popupPlayTime.innerHTML = timestr;

            showPopup(this.popupPlayTime, this.rangeProgress, DOCK_TYPE.BOTTOM_TOP, evt.clientX, -2);
        });
        this.rangeProgress.addEventListener('mouseleave', (evt) => {
            hidePopup(this.popupPlayTime);
        });
        this.rangeProgress.addEventListener('click', (evt) => {
            let pointedTime = this.calculateProgressByPoint(evt);
            console.log('seekTo ', secondsToHMS(pointedTime));
            this.videoCtrl.seekTo(pointedTime);
        });
    }

    updateProgress() {
      let playedSecs = Math.ceil(this.videoCtrl.currentTime);
      let durationSecs = Math.ceil(this.videoCtrl.duration);
      // console.log(`progress ${playedSecs}/${durationSecs}`);
      let currTimeStr = secondsToHMS(playedSecs);
      let totalTimeStr = secondsToHMS(durationSecs);
      this.textTimeElapsed.innerHTML = currTimeStr;
      this.textTimeTotal.innerHTML = totalTimeStr;
      this.rangeProgress.max = `${durationSecs}`;
      this.rangeProgress.value = `${playedSecs}`;
    }

    beginUpdateProgress() {
        let self = this;
        this._updateProgressTimer =  setInterval(function () {
            self.updateProgress();
        }, 1000); // update progress per second
    }

    stopUpdateProgress() {
        if(this._updateProgressTimer) {
            clearTimeout(this._updateProgressTimer);
        }
    }

    calculateProgressByPoint(evt) {
        let durationSecs = Math.ceil(this.videoCtrl.duration);
        let maxVal = this.rangeProgress.clientWidth;
        return Math.round(durationSecs*(evt.offsetX/maxVal));
    }

    initBackButton() {
        this.btnBack = document.getElementById('div-back-main');
        this.btnBack.addEventListener('click', () => {
            // this.hide();
            pageMgr.activePage("page-main");
        });
    }

    initVideoRatio() {
        this.videoRatioUser = null;
        this.videoClass = null;
        this.videoCtrl.addEventListener(VIDEOCTRL_ASPECT_RATIO_EVENT, (evt) => {
            let ctrl = evt.detail.ctrl;
            console.log('videoctrl ratio:', ctrl.width, ctrl.height, ctrl.ratio);
            console.log('window: ', window.innerWidth, window.innerHeight);
            console.log('screen: ', window.screen.width, window.screen.height);
            console.log('devicePR:', window.devicePixelRatio);
            this._adjustVideoSize();
            // let scaleRatio = 1;
            // if(ctrl.width > window.innerWidth || ctrl.height > window.innerHeight) {

            // }
            // = window.innerWidth/ctrl.width;
            
        });
    }

    initVideoContainer() {
        this.videoContainer = document.getElementById('div-video');
        let vcStyle = getComputedStyle(this.videoContainer);
        this._vcBorderWidth = parseFloatWithDefault(vcStyle.border);
        if(isNaN(this._vcBorderWidth)) {
            this._vcBorderWidth = 0;
        }
        this._vcPaddingWidth = {
            'left': parseFloatWithDefault(vcStyle.paddingLeft),
            'right': parseFloatWithDefault(vcStyle.paddingRight),
            'top': parseFloatWithDefault(vcStyle.paddingTop),
            'bottom': parseFloatWithDefault(vcStyle.paddingBottom)
        };

        console.log('videoContainer rect', this._vcBorderWidth, this._vcPaddingWidth);
    }

    initVideo() {
        this.initVideoContainer();
        this.mainVideoEl = document.getElementById('video-main');
        console.log('mainVideo playrate', this.mainVideoEl.playbackRate);
        // this.mainVideoEl.preservesPitch = false;
        this.videoCtrl = new PWAVideoCtrl(this.mainVideoEl);
        
        this.rightVideoEl = null;
        document.addEventListener(VIDEO_SOURCE_CHANGE_EVENT, (evt) => {
            console.log('receive video src event! ', evt);
            if(evt.detail.files) {
                let src = evt.detail.files[0];
                console.log('src ', src);
                if(src instanceof File) {
                    console.log('video src ', src.name, src.size);
                    this.videoCtrl.playLocalFile(src);
                } else {
                    this.videoCtrl.playSource(src);
                }
                this.videoCtrl.clearVTT();
            }
        });
        this.videoContainer.addEventListener('click', () => {
            if(this.controlsShowed) {
                this.hideControls();
            } else {
                this.showControls();
            }
        })
       this.initVideoRatio();
    }

    switchMode(mode) {
        console.log('swithMode to', mode);
        let newVideoCtrl = null;
        if(mode == this.MODE_NORMAL && this.videoCtrl instanceof PWASBSVideoCtrl) {
          this.showNormalVideo();
          newVideoCtrl = new PWAVideoCtrl(this.mainVideoEl);
        } else if(mode == this.MODE_SBS && this.videoCtrl instanceof PWAVideoCtrl) {
            console.log('swithMode ', mode);
          this.showSBSVideo();
          newVideoCtrl = new PWASBSVideoCtrl(this.mainVideoEl, this.rightVideoEl);
        }
        if(newVideoCtrl != null) {
          // release old videoCtrl
          this.videoCtrl.pause();
          let src = this.videoCtrl.src;
          let playAtTime = this.videoCtrl.currentTime;
          let width = this.videoCtrl.width;
          let height = this.videoCtrl.height;
          let ratio = this.videoCtrl.ratio;
          this.videoCtrl.free();
          // run new VideoCtrl
          this.videoCtrl = newVideoCtrl;
          this.videoCtrl.width = width;
          this.videoCtrl.height = height;
          this.videoCtrl.ratio = ratio;
          if(src) {
            this.videoCtrl.playSource(src, playAtTime);
          }
        }
      }

      showSBSVideo() {
        // if(hasWord('single-video', this.mainVideoEl.className)) {
        //     this.mainVideoEl.className = removeWord('single-video', this.mainVideoEl.className);   
        // }
        // if(!hasWord('sbs-video', this.mainVideoEl.className)) {
        //     this.mainVideoEl.className = addWord('sbs-video', this.mainVideoEl.className);
        // }
        this.rightVideoEl = document.createElement('video');
        // this.rightVideoEl.preservesPitch = false;
        this.rightVideoEl.id = 'video-right';
        this.rightVideoEl.className = this.mainVideoEl.className;
        this.videoContainer.appendChild(this.rightVideoEl);

      }

      showNormalVideo() {
          if(this.rightVideoEl) {
            this.rightVideoEl.remove();
          }
        //   if(hasWord('sbs-video', this.mainVideoEl.className)) {
        //     this.mainVideoEl.className = removeWord('sbs-video', this.mainVideoEl.className);   
        //   }
        //   if(!hasWord('single-video', this.mainVideoEl.className)) {
        //     this.mainVideoEl.className = addWord('single-video', this.mainVideoEl.className);
        //   }
          this.rightVideoEl = null;
      }

      _adjustVideoSize() {
        let videos = this.videoContainer.getElementsByTagName('video');
        let vcAdditionHeight = this._vcPaddingWidth.top + this._vcPaddingWidth.bottom +
            this._vcBorderWidth*2;
        let vcAdditionWidth = this._vcPaddingWidth.left + this._vcPaddingWidth.right +
            this._vcBorderWidth*2;
        console.log('vcAdditionHeight ', vcAdditionHeight);
        let vcSize = [this.videoCtrl.width*videos.length+vcAdditionWidth,
            this.videoCtrl.height+vcAdditionHeight, vcAdditionWidth, vcAdditionHeight];
        if(window.innerHeight >= vcSize[1] &&
             window.innerWidth >= vcSize[0]) {
            this._keepVideoSize(videos, vcSize);
        } else {
            this._fitScreenSize(videos, vcSize);
        }
      }

      _keepVideoSize(videos, vcSize) {
          let cwidth = vcSize[0] + 'px';
          let vwidth = this.videoCtrl.width + 'px';
          let vheight = this.videoCtrl.height + 'px'
          let marginVeri = (window.innerHeight - vcSize[1])/2 + 'px';
          let marginHori = (window.innerWidth - vcSize[0])/2 + 'px';
          for(let v of videos) {
              v.style.width = vwidth;
              v.style.height = vheight;
          }
          this.videoContainer.style.width = cwidth;
          this.videoContainer.style.height = vheight;
          this.videoContainer.style.marginTop = marginVeri;
          this.videoContainer.style.marginBottom = marginVeri;
          this.videoContainer.style.marginLeft = marginHori;
          this.videoContainer.style.marginRight = marginHori;
          
      }



      _fitScreenSize(videos, vcSize) {
        console.log('fit screen ', vcSize, window.innerWidth, window.innerHeight);
        let scale = Math.max(vcSize[0]/window.innerWidth, vcSize[1]/window.innerHeight);
        // let vWidthVal = this.videoCtrl.width/scale;
        let vcClientWidthVal = Math.ceil(vcSize[0]/scale);
        let vcClientHeightVal = Math.ceil(vcSize[1]/scale);
        let cWidthVal = vcClientWidthVal - vcSize[2];
        let cHeightVal = vcClientHeightVal - vcSize[3] ;
        let vwidth = Math.ceil(cWidthVal/videos.length) + 'px';
        let vheight = cHeightVal + 'px';
        let marginVeri = (window.innerHeight - vcClientHeightVal)/2 + 'px';
        let marginHori = (window.innerWidth - vcClientWidthVal)/2 + 'px';
        for(let v of videos) {
            v.style.width = vwidth;
            v.style.height = vheight;
        }
        // this.videoContainer.style.width = vWidthVal*videos.length + 'px';
        this.videoContainer.style.width = cWidthVal + 'px';
        this.videoContainer.style.height = cHeightVal + 'px';
        this.videoContainer.style.marginTop = marginVeri;
        this.videoContainer.style.marginBottom = marginVeri;
        this.videoContainer.style.marginLeft = marginHori;
        this.videoContainer.style.marginRight = marginHori;
      }

      _onResize() {
        console.log(Date.now(), 'window resize ', window.innerWidth, window.innerHeight, window.location.href);
        if(this.videoCtrl.ratio) { // After video loadedmetadata
           this._adjustVideoSize(); 
            
        }
      }
}

class PageManager {
    constructor(pagesList, defaultPage) {
        this._defaultPage = defaultPage;
        this._pages = new Map(pagesList.map((page) => {
            page.hide();
            return [page.id, page];
        }));
        console.log('pages count ', this._pages.size);
        this.currentPage = null;
        this.activePage();
    }

    activePage(pageId) {
        let newCurrent = null;
        if(pageId) {
            newCurrent = this._pages.get(pageId);    
        } else {
            newCurrent = this._defaultPage;
        }
        if(this.currentPage) {
            this.currentPage.hide();
        }
        this.currentPage = newCurrent;
        console.log('active page ', newCurrent.id);
        this.currentPage.active();
    }
    
};

var pageMgr = null;

document.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOM loaded!');
   
    let playPage = new PlayerUI();
    let mainPage = new MainUI();

    pageMgr = new PageManager([playPage, mainPage], mainPage);
});



