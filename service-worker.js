var VER = "0.1.48"
var CACHE_NAME = "PWAPLAYER_CACHE_"+VER;
SITE_FILES = new Set(['./index.html',
    './index.js',
    './app.webmanifest',
    './images/icon.png',
    './lib/ui_popup.js', 
    './lib/ui_share_place.js', 
    './lib/utils.js', 
    './lib/h5_video_ctrl.js',
    './lib/wp_video_ctrl.js',
    './wasm_player/player_backend.js',
    './wasm_player/webgl_renderer.js',
    './wasm_player/graphsubtitle_renderer.js',
    './wasm_player/wasmplay.js',
    './wasm_player/wasmplay.worker.js',
    './wasm_player/wasmplay.wasm',
    './wasm_player/ass.js/ass.js',
    './wasm_player/ass.js/htmlrenderer.js',
    './wasm_player/ass.js/interpolating.js',
    './style.css',
    './iso_639-2.min.json'
  ]);

function log(...args) {
  console.log(`[SW ${VER}]`, ...args);
}

async function doInstall() {
    try {
        let cache = await caches.open(CACHE_NAME);
        // let oldkeys = await cache.keys();
        // console.log('cache before install:', oldkeys);
        let result = await cache.addAll(SITE_FILES);
        let keys = await cache.keys();
        log('cache after install:', keys);
        return result;
    } catch(err) {
        return err;
    }
    
}
self.addEventListener('install', (e) => {
    log(`Install `, e);
    e.waitUntil(doInstall());
});

// delete old cache prevent storage leak
async function doActivate() {
    try {
        let names = await caches.keys();
        for(let name of names) {
            if(name != CACHE_NAME) {
                await caches.delete(name);
                log('deleted old cache '+name);
            }
            
        }
        return;
    } catch(err) {
        return err;
    }
}

self.addEventListener('activate', (e) => {
    log(`Activate `, e);
    e.waitUntil(doActivate());
});

async function onFetch(evt) {
    let request = evt.request;
    // console.log("onFetch ", JSON.stringify(evt.request, null, '\t'));
    let resp = await caches.match(request);
    if(resp) {
        log('hit cache ', request.url, resp);
        // return resp;
    } else {
        // default go to network
        log('fetch ', request.url);
        if(request.mode === "no-cors") { // We need to set `credentials` to "omit" for no-cors requests, per this comment: https://bugs.chromium.org/p/chromium/issues/detail?id=1309901#c7
            request = new Request(request.url, {
              cache: request.cache,
              credentials: "omit",
              headers: request.headers,
              integrity: request.integrity,
              destination: request.destination,
              keepalive: request.keepalive,
              method: request.method,
              mode: request.mode,
              redirect: request.redirect,
              referrer: request.referrer,
              referrerPolicy: request.referrerPolicy,
              signal: request.signal,
            });
          }
        resp =  await fetch(request);
    }
    if(resp.status === 0) {
        return resp;
    }
  
    const headers = new Headers(resp.headers);
    headers.set("Cross-Origin-Embedder-Policy", "require-corp"); // or: require-corp
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    
    return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });
    // return resp;
}

self.addEventListener('fetch', (e) => {
    log(`Fetch `, e);
    e.respondWith(onFetch(e));
});

async function handleMessage(client, cmd) {
    if(cmd.type == "VER") {
        client.postMessage(JSON.stringify({"type":"VER", "value":VER}));
    } else if(cmd.type == "SKIP_WAITING") {
        log("received skipWaiting command");
        self.skipWaiting();
    }
}

self.addEventListener("message", (e) => {
    let cmd = JSON.parse(e.data);
    log("received command from navigator:", e);
    e.waitUntil(handleMessage(e.source, cmd));
})
