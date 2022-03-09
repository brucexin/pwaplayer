// from: https://stackoverflow.com/questions/8885701/play-local-hard-drive-video-file-with-html5-video-tag
// from: http://jsfiddle.net/dsbonev/cCCZ2/

var localFileVideoPlayer = function () {
	'use strict'
  var URL = window.URL || window.webkitURL;
  var displayMessage = function (message, isError) {
    var element = document.querySelector('#message')
    element.innerHTML = message
    element.className = isError ? 'error' : 'info'
  };
  var playSelectedFile = function (event) {
    var file = this.files[0];
    var type = file.type;
    var videoNode = document.getElementById("videoOrion");
    var canPlay = videoNode.canPlayType(type);
    if (canPlay === '') canPlay = 'no';
    var message = 'Can play type "' + type + '": ' + canPlay;
    var isError = canPlay === 'no';
    displayMessage(message, isError);

    if (isError) {
      return;
    }

    var fileURL = URL.createObjectURL(file);
    videoNode.src = fileURL;
  }
  var inputNode = document.getElementById("fileVideoOpen");
  //var inputNode = document.querySelector('input')
  inputNode.addEventListener('change', playSelectedFile, false);
};