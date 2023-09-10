import {secondsToHMS} from "../lib/utils.js";
import {DOCK_TYPE, showPopup, hidePopup} from "../lib/ui_popup.js";
import {default as backend} from "./player_backend.js";

let _BE = null;

function handleVideoSourceMetaData(data) {
  console.log('handleVideoSourceMetaData', data);
  document.title = data.title;
  document.getElementById('label-playtime').innerText = secondsToHMS(data.duration);
  document.getElementById('input-playtime').max = data.duration;
}

function handleVideoSizeChanged(data) {
  let width = data.width;
  let height = data.height;
  let canvas = document.getElementById('main');
  let rect = canvas.getClientRects()[0];
  let cWidthVal = width;
  let cHeightVal = height;
  if(width > (window.innerWidth-rect.left*2) || height > window.innerHeight) {
    let scale = Math.max(width/(window.innerWidth-rect.left*2), height/window.innerHeight);
    cWidthVal = Math.floor(width/scale);
    cHeightVal = Math.floor(height/scale);
  }

  canvas.style.width = cWidthVal + 'px';
  canvas.style.height = cHeightVal + 'px';
  _BE.handleCanvasResize();
  // _BE.setSBSMode();
}

function addExternalSubtitleStream(subtitleSelector) {
  const subInput = document.getElementById('subtitle-input');
  if(subInput.files.length) {
    let streamid = 1000;
    let option = document.createElement('option');
    option.text = `${streamid} ${subInput.files[0].name}`;
    option.value = streamid;
    let id = `option-subtitle-stream-${streamid}`;
    let oldNode = document.getElementById(id);
    if(oldNode) {
      subtitleSelector.replaceChild(option, oldNode);
    } else {
      subtitleSelector.add(option);
    }
  }
}

function handleVideoBegin(playInfo) {
  let streams = _BE.getStreams();
  console.log('video begin play, streams info:', streams);
    // , JSON.stringify(streams, null, '\t'));
  console.log('video begin play, play info:', playInfo);
  const metadataArea = document.getElementById('textarea-metadata');
  let metadataText = JSON.stringify(streams, null, 2);
  metadataArea.innerText = metadataText;
  const subtitleSelector = document.getElementById('subtitle-select');
  const audioSelector = document.getElementById('audio-select');
  // subtitleSelector.textContent = '';
  // audioSelector.textContent = ';'
  subtitleSelector.replaceChildren();
  audioSelector.replaceChildren();
  for(let streamID in streams[0]) {
    let stream = streams[0][streamID];
   if(stream.type == 2 || stream.type == 3) {
    let option = document.createElement('option');
    option.text = `${stream.id} ${stream.language}`;
    option.value = stream.id;
    if(stream.type == 2) {
      if(playInfo.audioStreamID == streamID) {
        option.defaultSelected = true;
      }
      option.id = `option-audio-stream-${stream.id}`;
      audioSelector.add(option);
    } else {
      if(playInfo.subtitleStreamID == streamID) {
        option.defaultSelected = true;
      }
      option.id = `option-subtitle-stream-${stream.id}`;
      subtitleSelector.add(option);
    }
   }
  }
  addExternalSubtitleStream(subtitleSelector);
  // _BE.onSeek(300.0); // jump to 5:00 position for test
}

function handleVideoEnd() {
  const btnPause = document.getElementById('btn-pause');
  btnPause.disabled = true;
  const btnPlay = document.getElementById('btn-play');
  btnPlay.disabled = false;
  const btnEnd = document.getElementById('btn-end');
  btnEnd.disabled = true;
}

function handleRenderEnd(renderInfo) {
  let fcel = document.getElementById('span_frames_count');
  fcel.innerHTML = `${renderInfo.framesCount}`;
  let fpsEl = document.getElementById('h2_fps');
  fpsEl.innerHTML = `${renderInfo.fps}`;
  let ptsEl = document.getElementById('h2_pts');
  ptsEl.innerHTML = `${renderInfo.timer}`;
  let ptsDivEl = document.getElementById('div_pts');
  let canvas = document.getElementById('main');
  showPopup(ptsDivEl, canvas, DOCK_TYPE.TOP_TOP, 0, 0);
}

function init() {
  let canvas = document.getElementById('main');
  _BE = new backend(canvas);
  canvas.addEventListener('resize', (event) => {
    // _BE.setSBSMode();
  });

  const input = document.getElementById('file-input');
  input.addEventListener('change', (event) => {
    let fileObj = event.currentTarget.files[0];
    console.log('select file '+fileObj.name);
    _BE.setSource(fileObj);
  });

  const subInput = document.getElementById('subtitle-input');
  subInput.addEventListener('change', (event) => {
    console.log('select subtitle files ', event.currentTarget.files.length);
    _BE.setExternalSubtitleFiles(event.currentTarget.files);
    const subtitleSelector = document.getElementById('subtitle-select');
    addExternalSubtitleStream(subtitleSelector);
  });

  const btnPlay = document.getElementById('btn-play');
  btnPlay.addEventListener("click", (event) => {
    _BE.onPlay();
    const btnPause = document.getElementById('btn-pause');
    btnPause.disabled = false;
    const btnPlay = document.getElementById('btn-play');
    btnPlay.disabled = true;
    const btnEnd = document.getElementById('btn-end');
    btnEnd.disabled = false;
  });

  const btnPause = document.getElementById('btn-pause');
  btnPause.addEventListener("click", (event) => {
    _BE.onPause();
    const btnPause = document.getElementById('btn-pause');
    btnPause.disabled = true;
    const btnPlay = document.getElementById('btn-play');
    btnPlay.disabled = false;
  });

  const btnEnd = document.getElementById('btn-end');
  btnEnd.addEventListener("click", (event) => {
    _BE.onEnd();
    const btnPause = document.getElementById('btn-pause');
    btnPause.disabled = true;
    const btnPlay = document.getElementById('btn-play');
    btnPlay.disabled = false;
    const btnEnd = document.getElementById('btn-end');
    btnEnd.disabled = true;
  });

  const inputBg = document.getElementById('bg-input');
  inputBg.addEventListener("change", (event) => {
    let bgInputFile = event.currentTarget.files[0];
    console.log('select bg file '+bgInputFile.name);
    if(bgUrl) {
      URL.revokeObjectURL(bgUrl);
    }
    bgUrl = URL.createObjectURL(bgInputFile);
    let canvas = document.getElementById('main');
    canvas.style = `background: no-repeat center url("${bgUrl}")`;
  });

  const seeker = document.getElementById('input-playtime');
  seeker.addEventListener("change", (event) => {
    console.log('seeker change: this is ', this, event.target.id);
    let value = parseFloat(event.target.value);
    _BE.onSeek(value);
    let showEl = document.getElementById('label-playtime');
    showEl.innerText = secondsToHMS(value);
  });

  const sbsInput = document.getElementById('sbsmode-input');
  sbsInput.addEventListener("change", (event) => {
    if(sbsInput.checked) {
      _BE.setSBSMode({scaleLevel:0.8});
    } else {
      _BE.setNormalMode(1);
    }
  });

  const volumeInput = document.getElementById('input-volume');
  volumeInput.addEventListener("change", (event) => {
    let volume = parseFloat(event.target.value);
    _BE.setVolume(volume/10);
  });

  const ssBtn = document.getElementById('btn-streamselect-apply');
  ssBtn.addEventListener("click", () => {
    const subtitleSelector = document.getElementById('subtitle-select');
    const audioSelector = document.getElementById('audio-select');
    let subtitleOption = subtitleSelector.selectedOptions[0];
    let audioOption = audioSelector.selectedOptions[0];
    let substitleValue = subtitleOption ? subtitleOption.value : null;
    console.log(`subtitle selected ${substitleValue} audio selected ${audioOption.value}`);
    // _BE.setAudio();
    // _BE.setSubtitle();
    _BE.onChangeStreams(
      parseInt(audioOption.value), 
      parseInt(substitleValue)
    );
  });

  _BE.onVideoSizeChanged = handleVideoSizeChanged;
  _BE.onVideoSourceMetaData = handleVideoSourceMetaData;
  _BE.onVideoBegin = handleVideoBegin;
  _BE.onVideoEnd = handleVideoEnd;
  _BE.onRenderEnd = handleRenderEnd;
  // _BE.setSBSMode();
}

document.addEventListener('DOMContentLoaded', (event) => {
  console.log('DOM loaded!');
  init();
});
