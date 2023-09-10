const vsSource=`
attribute vec4 aVertexPosition;
attribute vec2 aVertexCoord;

uniform ivec2 uOffset;

varying highp vec2 vTextureCoord;

void main(void) {
  //gl_Position = aVertexPosition + vec4(float(uOffset.x), float(uOffset.y), 0.0, 0.0);
    // gl_Position = aVertexPosition;
  gl_Position = vec4(aVertexPosition.x, aVertexPosition.y*-1.0, aVertexPosition.z, aVertexPosition.w);
  vTextureCoord = aVertexCoord;
}
`,fsSource=`precision mediump float;
uniform ivec2 uTextureSize;
uniform sampler2D uPalette;             // A palette of 256 colors
uniform sampler2D uIndexedColorTexture; // A texture using indexed color
varying vec2 vTextureCoord;                // UVs

void main()
{
    // Pick up a color index
    vec4 index = texture2D(uIndexedColorTexture, vTextureCoord);
    // Retrieve the actual color from the palette
    vec4 texel = texture2D(uPalette, vec2(index.x, 0.0));
    gl_FragColor = vec4(texel.bgr, texel.a);
}`;function loadShader(e,t,r){t=e.createShader(t);return e.shaderSource(t,r),e.compileShader(t),e.getShaderParameter(t,e.COMPILE_STATUS)?t:(alert("An error occurred compiling the shaders: "+e.getShaderInfoLog(t)),e.deleteShader(t),null)}class GraphSubtitleRenderer{constructor(e,t){this.canvas=new OffscreenCanvas(e,t);e=this.canvas.getContext("webgl2");if(!e)throw new Error("get webgl context failed!");var t=e.createProgram(),r=loadShader(e,e.VERTEX_SHADER,vsSource),o=loadShader(e,e.FRAGMENT_SHADER,fsSource);if(e.attachShader(t,r),e.attachShader(t,o),e.linkProgram(t),!e.getProgramParameter(t,e.LINK_STATUS))throw new Error("Unable to initialize the shader program: "+e.getProgramInfoLog(t));e.useProgram(t),e.pixelStorei(e.UNPACK_ALIGNMENT,1);var i=e.createTexture(),a=(e.bindTexture(e.TEXTURE_2D,i),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.createTexture()),n=(e.bindTexture(e.TEXTURE_2D,a),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.getAttribLocation(t,"aVertexPosition")),T=e.getAttribLocation(t,"aVertexCoord"),s=e.getUniformLocation(t,"uOffset"),l=e.getUniformLocation(t,"uIndexedColorTexture"),E=e.getUniformLocation(t,"uPalette");e.enableVertexAttribArray(n),e.enableVertexAttribArray(T),this.gl=e,this.prog=t,this.vertexShader=r,this.fragmentShader=o,this.texture=i,this.texturePalette=a,this.aVertexPositionLoc=n,this.aVertexCoordLoc=T,this.uOffsfetLoc=s,this.uSamplerLoc=l,this.uPaletteLoc=E}render(e){var t,r=this.gl;r.viewport(0,0,r.canvas.width,r.canvas.height),r.clearColor(0,0,0,0),r.clear(r.COLOR_BUFFER_BIT);for(t of e)console.log(`Player: subtitle rect x=${t.x} y=${t.y} width=${t.width} height=${t.height} colors=${t.nb_colors} linesize=${t.linesize} pixels=${t.pixels.length} palette=`+t.palette.length),this._renderSubRect(t)}_renderSubRect(e){var t=this.gl,r=(t.viewport(e.x,t.canvas.height-e.y,e.width,e.height),t.createBuffer()),r=(t.bindBuffer(t.ARRAY_BUFFER,r),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,-1,1,1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW),t.vertexAttribPointer(this.aVertexPositionLoc,2,t.FLOAT,!1,0,0),t.createBuffer());t.bindBuffer(t.ARRAY_BUFFER,r),t.bufferData(t.ARRAY_BUFFER,new Float32Array([0,0,0,1,1,0,1,0,0,1,1,1]),t.STATIC_DRAW),t.vertexAttribPointer(this.aVertexCoordLoc,2,t.FLOAT,!1,0,0),t.uniform2iv(this.uOffsfetLoc,[e.x,e.y]),t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,this.texture),t.texImage2D(t.TEXTURE_2D,0,t.LUMINANCE,e.width,e.height,0,t.LUMINANCE,t.UNSIGNED_BYTE,new Uint8Array(e.pixels)),t.uniform1i(this.uSamplerLoc,1),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,this.texturePalette),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,256,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array(e.palette)),t.uniform1i(this.uPaletteLoc,0),t.drawArrays(t.TRIANGLES,0,6)}async toBlob(){return this.canvas.convertToBlob()}}export{GraphSubtitleRenderer};