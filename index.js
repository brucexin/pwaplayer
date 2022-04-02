import {addWord, removeWord, hasWord} from './lib/utils.js';
import { SharePlaceGroup } from "./lib/ui_share_place.js";
import {DOCK_TYPE, showPopup, hidePopup} from "./lib/ui_popup.js";

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
    }
    
}

class PlayerUI extends Page {
    constructor() {
        super(document.getElementById("page-player"), 'hidden-display');
        this.playControls = document.getElementById('div-play-controls');
        this.controlsShowed = false;

       this.popupGroup = new PopupGroup();

       this.initVideo();

       this.initFullscreenButtons();
       this.initViewModeButtons();
       this.initVolumeButtons();
       this.initPlayButtons();
       this.initProgressCtrls();
       this.initBackButton();
    }

    active() {
        super.active();
        document.documentElement.requestFullscreen();
        screen.orientation.lock('landscape');
        this.hideControls();
    }

    hide() {
        super.hide();
        if(document.fullscreenElement) {
            document.exitFullscreen();
            screen.orientation.unlock();
        }
        this.hideControls();
        if(!this.video.ended) {
            this.video.pause();
        }
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
            this.spFullscreen.updateTo(this.btnFullscreenExit);
        })

        this.btnFullscreenExit.addEventListener('click', () => {
            this.spFullscreen.updateTo(this.btnFullscreen);
        })
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
        })

        this.btnNormalMode.addEventListener('click', () => {
            this.spViewMode.updateTo(this.btnVRMode);
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

        this.btnMute.addEventListener('click', () => {
            this.spVolume.updateTo(this.btnVolumeOpen);
            this.rangeVolume.disabled="disabled";
        })

        this.btnVolumeOpen.addEventListener('click', () => {
            this.spVolume.updateTo(this.btnMute);
            this.rangeVolume.disabled="";
        })
    }

    initPlayButtons() {
        this.btnPlay = document.getElementById('btn-play');
        this.btnPause = document.getElementById('btn-pause');
        this.spPlay = new SharePlaceGroup([this.btnPlay, this.btnPause], "hidden-display");

        this.spPlay.disableAll()
        this.spPlay.updateTo(this.btnPlay);

        this.btnPlay.addEventListener('click', () => {
            this.spPlay.updateTo(this.btnPause);
            this.video.play();
        })

        this.btnPause.addEventListener('click', () => {
            this.spPlay.updateTo(this.btnPlay);
            this.video.pause();
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
            });
        });

        this.video.addEventListener('play', () => {
            if(this.spPlay.currentElement != this.btnPause) {
                this.spPlay.updateTo(this.btnPause);
            }
        })

        this.video.addEventListener('pause', () => {
            if(this.spPlay.currentElement != this.btnPlay) {
                this.spPlay.updateTo(this.btnPlay);
            }
        })
    }

    initProgressCtrls() {
        this.rangeProgress = document.getElementById('range-progress');
        this.popupPlayTime = document.getElementById('div-popup-playtime');

        console.log('register range hover');
        this.rangeProgress.addEventListener('mousemove', (evt) => {
            showPopup(this.popupPlayTime, this.rangeProgress, DOCK_TYPE.BOTTOM_TOP, evt.clientX, -2);
        });
        this.rangeProgress.addEventListener('mouseleave', (evt) => {
            hidePopup(this.popupPlayTime);
        });
        // this.rangeVolume.addEventListener('click', (evt) => {
        //     self.changeTimeByProgressClick(evt);
        // });
    }

    initBackButton() {
        this.btnBack = document.getElementById('div-back-main');
        this.btnBack.addEventListener('click', () => {
            // this.hide();
            pageMgr.activePage("page-main");
        });
    }

    initVideo() {
        this.video = document.getElementById('mainVideo');
        document.addEventListener(VIDEO_SOURCE_CHANGE_EVENT, (evt) => {
            console.log('receive video src event! ', evt);
            if(evt.detail.files) {
                let src = evt.detail.files[0];
                console.log('src ', src);
                if(src instanceof File) {
                    console.log('video src ', src.name, src.size);
                    var fileURL = URL.createObjectURL(src);
                    this.video.src = fileURL;
                    this.video.play();
                } else {
                    throw new Error("video source is not a file!");
                }
            }
        });
        this.video.addEventListener('click', () => {
            if(this.controlsShowed) {
                this.hideControls();
            } else {
                this.showControls();
            }
        })
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

