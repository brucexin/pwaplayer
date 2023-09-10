import createWASMPlay from"./wasmplay.js";import{DOCK_TYPE,showPopup,hidePopup}from"../lib/ui_popup.js";import{WebGLRenderer}from"./webgl_renderer.js";import{GraphSubtitleRenderer}from"./graphsubtitle_renderer.js";window.player_action_queue=[],window.pop_action=function(){return window.player_action_queue.shift()},window.push_action=function(e){window.player_action_queue.push(e)};let wasminst=null,fileDuration=0,fileTitle="",fileEncoder="",currentFileId=0,streamMetadata={},srcVideoWidth=0,srcVideoHeight=0,srcPixelFormat=-1,sampleRate=0,sampleChannels=0;const _STATE_INIT=0,_STATE_BEGIN=1,_STATE_DATAREADY=_STATE_BEGIN+1,_STATE_PLAY=+_STATE_DATAREADY+1,_STATE_PAUSE=_STATE_PLAY+1,_STATE_EOF=_STATE_PAUSE+1,_STATE_END=_STATE_EOF+1;let _playStateLast=null,_playState=_STATE_INIT,_pollSpeed=2,audioCtx=null,audioNodesChain=[],_audioClockDrift=0,_audioSeekDrift=0,assData=null,renderStartTime=null,renderer=null,videoFramesCount=0,videoFramesPerSec=0,videoLastPTS=0,workerfsFileMap={},inputFile=null,subtitleFile=null;const PLAYER_ACTION_PLAY=1,PLAYER_ACTION_PAUSE=2,PLAYER_ACTION_STOP=3,PLAYER_ACTION_SEEK=4,PLAYER_ACTION_CHANGE_STREAMS=5,EXTERNAL_SUBTITLE_STREAM_ID=1e3,SUB_TYPE_STOP=0,SUB_TYPE_GRAPH=1,SUB_TYPE_TEXT=2,SUB_TYPE_KEEP=3;function array2Hex(e,i=8){var a=new Uint8Array(e);let o="";for(let t=0;t<a.length;){let e=a[t++].toString(16);e.length<2&&(e="0"+e),o+=e,t%i?o+=" ":o+="\r\n"}return o}function printErr(){var e=arguments[0];e.startsWith("main loop")||e.startsWith("maybeExit")||e.startsWith("runtimeKe")||console.error()}function setPlayState(e){_playStateLast=e,_playState=e}function togglePauseState(){_playState!=_STATE_PAUSE?(_playStateLast=_playState,_playState=_STATE_PAUSE):(_playState=_playStateLast,_playStateLast=_STATE_PAUSE)}function _player_get_clock_invalid(){return-1}function _player_get_clock(){return audioCtx.currentTime-_audioClockDrift+_audioSeekDrift}function _player_get_seek_clock(){return _audioSeekDrift}function _player_get_poll_params(){return{clock:window.player_get_clock(),audioPollSpeed:_pollSpeed}}function stingifyBigInt(e,t){return"bigint"==typeof t?t.toString():t}function fitScreenSize(e,t){var i=document.getElementById("main"),a=i.getClientRects()[0];let o=e,r=t;(e>window.innerWidth-2*a.left||t>window.innerHeight)&&(a=Math.max(e/(window.innerWidth-2*a.left),t/window.innerHeight),o=Math.floor(e/a),r=Math.floor(t/a)),i.style.width=o+"px",i.style.height=r+"px"}console.log("devicePixelRatio = "+window.devicePixelRatio);const _evtTypeMap={1:"WASMPlayerEventDataReady",2:"WASMPlayerEventEnd"};function emitWASMPlayerEvent(e,t){var i=_evtTypeMap[e];i?(i=new CustomEvent(i,{detail:{type:e,data:t},bubbles:!1,cancelable:!1,composed:!1}),window.dispatchEvent(i)):console.log("Cant get WASMPlayer event name for "+e)}function _onAudioNodeEnded(){console.log("audio end when "+audioCtx.currentTime),console.log(`audioNodesChain remain ${audioNodesChain.length} nodes`)}let _lastPTS=0,_audioWritePTS=0,_audioWritePos=0,_srcNode=null,_gainNode=null,_audioBuffer=null,_audioStartTime=null,_audioTimeout=null,_audioReceivedSamples=0,_AUDIO_CACHE_THRESOLD=1,_AUDIO_BUFFER_TIME=10,_AUDIO_GAP=null,_AUDIO_GAP_THRESOLD=.1,_AUDIO_SAFE_THRESOLD=5*_AUDIO_GAP_THRESOLD;function checkAudioState(){if(_playState!=_STATE_EOF&&_audioBuffer){var e=_player_get_clock();if(_audioWritePTS<e+_AUDIO_GAP_THRESOLD){for(let e=0;e<_audioBuffer.numberOfChannels;e++){_audioBuffer.getChannelData(e);var t,i=_AUDIO_GAP.getChannelData(0);_audioWritePos+_AUDIO_GAP.length>_audioBuffer.length?(t=_audioBuffer.length-_audioWritePos,_audioBuffer.copyToChannel(i.slice(0,t),e,_audioWritePos),t=_AUDIO_GAP.length-t,_audioBuffer.copyToChannel(i.slice(0,t),e)):_audioBuffer.copyToChannel(i,e,_audioWritePos)}_audioWritePos=(_audioWritePos+_AUDIO_GAP.length)%_audioBuffer.length,_audioWritePTS+=_AUDIO_GAP.duration,console.log(`Player: write audio gap pos ${_audioWritePos} pts `+_audioWritePTS),_pollSpeed=2}else _pollSpeed=_audioWritePTS>e+_AUDIO_BUFFER_TIME-_AUDIO_SAFE_THRESOLD?0:1;_audioTimeout=setTimeout(checkAudioState,5)}else console.log("Player: audio node stop at "+_audioWritePTS),null!=_srcNode&&_srcNode.stop(_audioWritePTS-_audioSeekDrift)}function flushPlayState(e){window.player_get_clock=_player_get_clock_invalid,_playState=_STATE_BEGIN,_srcNode.stop(),_audioBuffer=null,audioCtx.close(),audioCtx=null,audioNodesChain=[],_lastPTS=0,_audioWritePos=0,_srcNode=null,_gainNode=null,_audioBuffer=null,_audioStartTime=null,_audioTimeout=null,_audioReceivedSamples=0,_srcNode=null,_audioTimeout&&(clearTimeout(_audioTimeout),_audioTimeout=null),_audioWritePTS=e?_audioSeekDrift:_audioSeekDrift=0,_audioClockDrift=0,videoLastPTS=0}function playAudio(t,e,i){_srcNode||(_AUDIO_GAP=new AudioBuffer({numberOfChannels:1,length:.01*t.audioSampleRate,sampleRate:t.audioSampleRate}),_audioBuffer=new AudioBuffer({numberOfChannels:t.audioChannels,length:t.audioSampleRate*_AUDIO_BUFFER_TIME,sampleRate:t.audioSampleRate}),(_srcNode=audioCtx.createBufferSource()).buffer=_audioBuffer,_srcNode.onended=_onAudioNodeEnded,(_gainNode=audioCtx.createGain()).connect(audioCtx.destination),_srcNode.connect(_gainNode),_srcNode.loop=!0,audioNodesChain.push(_srcNode),_audioTimeout=setTimeout(checkAudioState,5));for(let e=0;e<t.audioChannels;e++){var a=t.audioData[e],o=_audioBuffer.getChannelData(e);for(let e=0;e<a.length;++e)o[(_audioWritePos+e)%_audioBuffer.length]=a[e]}_audioWritePos=(_audioWritePos+t.audioData[0].length)%_audioBuffer.length,_audioWritePTS+=t.audioDuration,t.audioStartTime<_lastPTS&&console.log(`Player: warning! audio start time overlapped, ${t.audioStartTime} `+_lastPTS),_lastPTS=t.audioStartTime,console.log(`Player: playAudio state wpos ${_audioWritePos} wpts ${_audioWritePTS} pts ${_lastPTS} pollSpeed `+_pollSpeed),_audioWritePTS>_player_get_clock()+_AUDIO_BUFFER_TIME&&console.log(`Player: warning!!! playAudio overwrite playing buffer: ${_audioWritePTS} > `+(_player_get_clock()+_AUDIO_BUFFER_TIME)),null==_audioStartTime&&(_srcNode.start(),_audioStartTime=audioCtx.currentTime,console.log("Player: playAudio started "+_audioStartTime)),_gainNode.gain.setValueAtTime(i,audioCtx.currentTime)}function _onAudioNodeEnded1(){console.log(`audio end when ${audioCtx.currentTime} node time `+this._startTime),_audioNodes[0].node==this&&_audioNodes.shift(),console.log(`audioNodesChain remain ${_audioNodes.length} nodes`)}let _audioNodes=[];function playAudio1(t,e){let i=0,a=t.audioStartTime;var o=_player_get_clock();if(t.audioStartTime<o){if(!(t.audioStartTime+t.audioDuration>o))throw new Error(`Player: audio late drop ${t.audioStartTime}+${t.audioDuration} <= `+o);i=(o-t.audioStartTime)*t.audioSampleRate,a=0}else a+=_audioClockDrift;if(i<0||i>=t.audioSampleNumber)throw new Error("Player: audio buffer length error "+i);var r=new AudioBuffer({numberOfChannels:t.audioChannels,length:t.audioSampleNumber-i,sampleRate:t.audioSampleRate});for(let e=0;e<t.audioChannels;e++){var l=t.audioData[e],n=r.getChannelData(e);for(let e=0;e<n.length;++e)n[e]=l[i+e]}var o=audioCtx.createBufferSource(),s=(o.buffer=r,o.onended=_onAudioNodeEnded1,o.connect(audioCtx.destination),o._startTime=a,_audioNodes.push({node:o,length:r.length,pts:a,opts:t.audioStartTime,oduration:t.audioDuration}),a+r.length/t.audioSampleRate);console.log(`Player: ${audioCtx.currentTime} source node start at ${a}-${s} length `+r.length),o.start(a)}let _testImg=null;function _playGraphSub(e,t,i){var a="img-subtitle-"+t.id;let o=document.getElementById(a);o||((o=document.createElement("img")).id=a,o.alt="graphics subtitle preview",hidePopup(o),document.body.appendChild(o));a=t.getBoundingClientRect();o.style.width=a.width+"px",o.style.height=a.height+"px",o.src=i,showPopup(o,t,DOCK_TYPE.BOTTOM_BOTTOM,0,0)}function _playASSSub(i,e){var t="div-subtitle-"+e.id;let a=document.getElementById(t);a||((a=document.createElement("div")).id=t,a.style.width=e.style.width,a.style.height="auto",a.style.minHeight="1rem",a.style.backgroundColor="transparent",a.style.display="flex",a.style.justifyContent="center",a.style.alignItems="center",a.style.flexDirection="column-reverse",hidePopup(a),document.body.appendChild(a));for(var t=e.getClientRects()[0],o=srcVideoWidth?t.width*window.devicePixelRatio/srcVideoWidth:1;a.firstChild;)a.removeChild(a.lastChild);a.style.width=e.style.width;for(let t=0;t<i.subtitleData.length;++t){var r=i.subtitleData[t];let e=ass.eventsFormat;"Layer"!=e[0]&&"Marked"!=e[0]||(e=e.slice(1));r=ass.parseEvent(r,e),r=Ass.Dialogue.fromRaw(r);ass.applyStylesToDialogue(r,a,window.devicePixelRatio*o)}showPopup(a,e,DOCK_TYPE.BOTTOM_BOTTOM,0,0)}function removeSubtitle(e){var t="div-subtitle-"+e.id,t=document.getElementById(t),t=(t&&t.parentNode.removeChild(t),"img-subtitle-"+e.id),e=document.getElementById(t);e&&e.parentNode.removeChild(e)}function playVideo(e){var t=e.videoWidth,i=e.videoHeight,a=t*i,o=new Uint8Array(a+a/4+a/4);let r=0;var l=e.videoData[0].data,n=e.videoLineSize[0],s=e.videoData[1].data,d=e.videoLineSize[1],u=e.videoData[2].data,_=e.videoLineSize[2];if(e.videoTimer<videoLastPTS)return console.log(`Player: playVideo get frame order wrong ${e.videoTimer} < `+videoLastPTS),!1;for(let e=0;e<i;e++){var c=e*n,c=new Uint8Array(l.slice(c,c+t));o.set(c,r),r+=c.length}for(let e=0;e<i/2;e++){var h=e*d,h=new Uint8Array(s.slice(h,h+t/2));o.set(h,r),r+=h.length}for(let e=0;e<i/2;e++){var S=e*_,S=new Uint8Array(u.slice(S,S+t/2));o.set(S,r),r+=S.length}return renderer.renderFrame(o,t,i,a,a/4),!0}function addWorkerFSFile(e){workerfsFileMap["/workerfs/"+e.name]=e}function doPlay(){window.push_action({type:PLAYER_ACTION_PLAY,data:{speed:1}}),null!=audioCtx&&audioCtx.resume(),togglePauseState()}function doPause(){null!=audioCtx&&audioCtx.suspend(),togglePauseState()}function onWASMPlayerEventDataReady(e){console.log("Player: wasm player data ready "+e.detail.data),audioCtx=new AudioContext;var e=new AudioBuffer({numberOfChannels:sampleChannels,length:sampleRate/1e3,sampleRate:sampleRate}),t=new AudioBufferSourceNode(audioCtx);t.buffer=e,t.onended=()=>{var e=audioCtx.getOutputTimestamp();console.log("Player: slience ended, check clock "+audioCtx.currentTime+" "+e.contextTime),_audioClockDrift=audioCtx.currentTime,window.player_get_clock=_player_get_clock},setPlayState(_STATE_DATAREADY),t.start(0)}function onWASMPlayerEventEnd(e){console.log("Player: received END event!");e=wasminst.UTF8ToString(e.detail.data);console.log("Player: end reason ",e),setPlayState("EOF"==e?_STATE_EOF:_STATE_END)}function hookWASMWorkerForFS(e){e=e.PThread;console.log("WASM: workers count is ",e.unusedWorkers.length);for(let r of e.unusedWorkers){let o=r.onmessage;r.onmessage=e=>{try{if("_req_get_file"==e.data.cmd){console.log("hook: received cmd _req_get_file "+e.data.names);var t,i=[];for(t of e.data.names){var a=workerfsFileMap[t];a?i.push(a):console.log("hook: cant found file "+t)}return void(i.length?r.postMessage({cmd:"_rsp_get_file",files:i}):r.postMessage({cmd:"_rsp_get_file",error:"no file"}))}}catch(e){return void console.log("hook: error "+e+" stack "+e.stack)}return o(e)}}}function getScreenCoordinates(e){var t={};for(t.x=e.offsetLeft,t.y=e.offsetTop;e.offsetParent&&(t.x=t.x+e.offsetParent.offsetLeft,t.y=t.y+e.offsetParent.offsetTop,e!=document.getElementsByTagName("body")[0]);)e=e.offsetParent;return t}class WASMPlayerBackend{constructor(e){this._canvas=e,this._fitScreenSize=fitScreenSize,this._viewport=null,this._viewInfo={scaleLevel:1},this._renderStartTime=null,this._videoFramesCount=0,this._videoFramesPerSec=0,this._videoLastPTS=0,this._fps=0,this._volume=1,this._subtitleStream=-1,this._audioStream=-1,this._subImgSrc=null,this._graphSubRenderer=null,renderer=new WebGLRenderer(e,{preserveDrawingBuffer:!1})}_clearViewport(e){if(this._viewport instanceof Array&&0<this._viewport.length){for(var t of this._viewport)removeSubtitle(t),e&&(console.log("remove child ",t.id),t.parentNode.removeChild(t));e&&(this._viewport=[])}else null!=this._viewport&&(removeSubtitle(this._viewport),e)&&(console.log("remove child ",this._viewport.id),this._viewport.parentNode.removeChild(this._viewport),this._viewport=null);this._subImgSrc=null}_renderGraphSub(i){this._graphSubRenderer||(this._graphSubRenderer=new GraphSubtitleRenderer(srcVideoWidth,srcVideoHeight));var e=Date.now(),e=(this._graphSubRenderer.render(i.subtitleData),Date.now()-e);console.log(`Player: graphSubRenderer consume ${e} ms`),this._graphSubRenderer.canvas.convertToBlob().then(e=>{if(this._subImgSrc&&URL.revokeObjectURL(this._subImgSrc),this._subImgSrc=URL.createObjectURL(e),console.log("Player: subtitle image blob url",this._subImgSrc),this._viewport instanceof Array)for(var t of this._viewport)_playGraphSub(i,t,this._subImgSrc);else _playGraphSub(i,this._viewport,this._subImgSrc)}).catch(e=>{console.log("Player: subtitle image blob convert failed!",e)})}_renderASSSub(e){if(this._viewport instanceof Array)for(var t of this._viewport)_playASSSub(e,t);else _playASSSub(e,this._viewport)}_playSubtitle(e){switch(e.subtitleType){case SUB_TYPE_GRAPH:this._renderGraphSub(e);break;case SUB_TYPE_TEXT:this._renderASSSub(e);break;case SUB_TYPE_KEEP:break;case SUB_TYPE_STOP:this._clearViewport()}}setSBSMode(e){this._clearViewport(),this._viewInfo=e=e||{scaleLevel:1},this._viewport=[];let t=document.createElement("div");var i=this._canvas.getBoundingClientRect(),a=.5*i.width*e.scaleLevel,o=.5*i.height*e.scaleLevel,r=getScreenCoordinates(this._canvas);t.id=e.left_id||"wasmplayer-view-left",t.style.width=a+"px",t.style.height=o+"px",t.style.left=r.x+(.5*i.width-a)+"px",t.style.top=r.y+.5*(i.height-o)+"px",t.style.position="absolute",t.style.visibility="hidden",document.body.appendChild(t),this._viewport.push(t),(t=document.createElement("div")).id=e.right_id||"wasmplayer-view-right",t.style.width=a+"px",t.style.height=o+"px",t.style.left=r.x+.5*i.width+"px",t.style.top=r.y+.5*(i.height-o)+"px",t.style.position="absolute",t.style.visibility="hidden",document.body.appendChild(t),this._viewport.push(t),renderer.setSBSMode(e.scaleLevel)}setNormalMode(e){if(this._clearViewport(),e){if(e<.1||1<e)throw console.log("Player: setNormalMode scaleLevel value out of range!"),new Error("Player: setNormalMode scaleLevel value out of range!")}else e=1;this._viewInfo={scaleLevel:e};var t=document.createElement("div"),i=this._canvas.getBoundingClientRect(),a=i.width*this._viewInfo.scaleLevel,o=i.height*this._viewInfo.scaleLevel,r=getScreenCoordinates(this._canvas);t.id="wasmplayer-view",t.style.width=a+"px",t.style.height=o+"px",t.style.left=r.x+.5*(i.width-a)+"px",t.style.top=r.y+.5*(i.height-o)+"px",t.style.position="absolute",t.style.visibility="hidden",document.body.appendChild(t),this._viewport=t,renderer.setNormalMode(e)}isSBS(){return this._viewport instanceof Array}handleCanvasResize(){renderer=new WebGLRenderer(this._canvas,{preserveDrawingBuffer:!1}),this.isSBS()?this.setSBSMode(this._viewInfo):this.setNormalMode(this._viewInfo.scaleLevel)}setSource(e){addWorkerFSFile(inputFile=e)}getStreams(){return streamMetadata}setExternalSubtitleFiles(e){subtitleFile=null;for(var t of e){if(!(Object.keys(workerfsFileMap).length<10))throw new Error("Player: WORKERFS can't mount 10 more files!");addWorkerFSFile(t),t.name.endsWith(".sub")||(subtitleFile=t)}if(!subtitleFile)throw new Error("cant get valid subtitle file from 'Input'!")}clearExternalSubtitleFiles(){subtitleFile=null}setSubtitle(e){this._subtitleStream=e}setAudio(e){this._audioStream=e}setVolume(e){1<e?e=1:e<0&&(e=0),this._volume=e}getClock(){return window.player_get_clock()}_playFrame(e){if(_playState==_STATE_DATAREADY&&(this.videoStreamID=e.videoStreamID,this.subtitleStreamID=e.subtitleStreamID,this.audioStreamID=e.audioStreamID,this._handleVideoBegin&&this._handleVideoBegin({videoStreamID:this.videoStreamID,audioStreamID:this.audioStreamID,subtitleStreamID:this.subtitleStreamID,timer:this.getClock()}),setPlayState(_STATE_PLAY)),0<e.audioSampleNumber)try{playAudio(e,wasminst,this._volume)}catch(e){console.error("playAudio exception: "+e+" stack:"+e.stack)}if(0<e.videoData.length)try{var t;playVideo(e,wasminst)&&(this._videoLastPTS=e.videoTimer,this._videoFramesCount++,t=Date.now(),this._renderStartTime?1e3<t-this._renderStartTime?(this._fps=this._videoFramesPerSec/((t-this._renderStartTime)/1e3),this._renderStartTime=t,this._videoFramesPerSec=0):this._videoFramesPerSec+=1:this._renderStartTime=t,this._handleRenderEnd)&&this._handleRenderEnd({fps:this._fps,framesCount:this._videoFramesCount,timer:this._videoLastPTS})}catch(e){console.error("playVideo exception: "+e,e.stack)}try{this._playSubtitle(e)}catch(e){console.error("playSubtitle exception: "+e,e.stack)}}onPlay(){let i=this;_playState==_STATE_PAUSE?doPlay():inputFile?_playState!=_STATE_INIT&&_playState!=_STATE_END?console.log("Player: It already in play phase!"):(setPlayState(_STATE_BEGIN),createWASMPlay({canvas:this.canvas,printErr:printErr}).then(e=>{hookWASMWorkerForFS(wasminst=e,inputFile),window.render_to_canvas=e=>{i._playFrame(e)},window.player_get_clock=_player_get_clock_invalid,window.player_get_poll_params=_player_get_poll_params,window.emitWASMPlayerMetadataEvent=e=>i.emitWASMPlayerMetadataEvent(e),window.emitWASMPlayerEvent=emitWASMPlayerEvent,window.addEventListener("WASMPlayerEventDataReady",e=>{onWASMPlayerEventDataReady(e)}),window.addEventListener("WASMPlayerEventEnd",e=>{onWASMPlayerEventEnd(e),i._handleVideoEnd&&i._handleVideoEnd()});let t=["-v","debug","-filter_threads","1"];subtitleFile?t=t.concat(["-subtitle_file","/workerfs/"+subtitleFile.name]):0<=this._subtitleStream&&(t=t.concat(["-sst",""+this._subtitleStream])),(t=0<=this._audioStream?t.concat(["-ast",""+this._audioStream]):t).push("/workerfs/"+inputFile.name),console.log("Player:  callMain args:",t),wasminst.callMain(t)}).catch(e=>{console.log("Player: onPlay error "+e)})):console.log("no file!")}onEnd(){window.push_action({type:PLAYER_ACTION_STOP}),null!=audioCtx&&audioCtx.close()}onPause(){window.push_action({type:PLAYER_ACTION_PAUSE}),doPause()}onSeek(e,t){var i=_player_get_clock();e.toFixed(3)!=i.toFixed(3)||t?(_audioSeekDrift=e,console.log("Player: new audioClockDrift is "+_audioSeekDrift),flushPlayState(!0),window.player_get_clock=_player_get_seek_clock,t=i<e,window.push_action({type:PLAYER_ACTION_SEEK,data:{seekToSecond:e,seekForward:t}})):console.log("Player: seeker no change")}onChangeStreams(e,t){var i,a={};if(_playState!=_STATE_PLAY&&_playState!=_STATE_PAUSE)throw console.log("Player: can't change streams at current state!"),new Error("Player: can't change streams at current!");null!=e&&e!=this.audioStreamID&&0<=e&&(a.audioStreamID=e),null!=t&&t!=this.subtitleStreamID&&0<=t&&(a.subtitleStreamID=t)==EXTERNAL_SUBTITLE_STREAM_ID&&(i=["/workerfs/"+subtitleFile.name],a.subtitleFiles=i),console.log(`Player: onChangeStreams change a ${this.audioStreamID}->${e} s ${this.subtitleStreamID}->`+t,a),Object.keys(a).length&&(console.log(`Player: onChangeStreams clock currentTime ${audioCtx.currentTime} drift ${_audioClockDrift} seek drift `+_audioSeekDrift),i=_player_get_clock(),a.currentClock=i,window.push_action({type:PLAYER_ACTION_CHANGE_STREAMS,data:a}),this.onSeek(i,!0))}set onVideoSizeChanged(e){this._fitScreenSize=e}set onVideoSourceMetaData(e){this._handleSourceMetaData=e}set onVideoBegin(e){this._handleVideoBegin=e}set onVideoEnd(e){this._handleVideoEnd=e}set onRenderEnd(e){this._handleRenderEnd=e}emitWASMPlayerMetadataEvent(e){if(console.log("WASMPlayerBackend: received emit from c++ ",JSON.stringify(e,stingifyBigInt,"\t")),1==e.type)srcVideoWidth?console.log("repeated video stream type! ",e):(srcVideoWidth=e.width,srcVideoHeight=e.height,srcPixelFormat=e.pixelFormat,this._fitScreenSize({width:srcVideoWidth,height:srcVideoHeight}),console.log(`get video metadata: w ${srcVideoWidth} h ${srcVideoHeight} f `+srcPixelFormat));else if(3==e.type)e.subHeader&&!assData&&(assData=Ass.fromString(e.subHeader),console.log("assData scriptInfo"+JSON.stringify(assData.scriptInfo,null,"\t")),console.log("assData styles"+JSON.stringify(assData.styles,null,"\t")),console.log("assData event formats"+JSON.stringify(assData.eventsFormat,null,"\t")));else if(2==e.type)sampleRate||(sampleChannels=e.channels,sampleRate=e.sampleRate),console.log(`get audio metadata: channels ${sampleChannels} rate `+sampleRate);else if(-1==e.type)return void(0==e.id?(currentFileId=e.id,streamMetadata[currentFileId]={},fileTitle=e.title,fileEncoder=e.codecName,fileDuration=Number(BigInt.asUintN(64,e.duration/BigInt(1e6))),console.log(`WASMPlayerBackend: get file metadata: title ${fileTitle} duration ${fileDuration} encoder `+fileEncoder),this._handleSourceMetaData&&this._handleSourceMetaData({title:fileTitle,encoder:fileEncoder,duration:fileDuration}),e.duration=fileDuration):console.log("Player: get file metadata, maybe external subtitle file!"));var t=streamMetadata[currentFileId];e.id in t?console.log(`Player: repeated stream ${currentFileId} metadata `+e.id):t[e.id]=e}}export default WASMPlayerBackend;