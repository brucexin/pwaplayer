var VER = "0.1.20"
var CACHE_NAME = "PWAPLAYER_CACHE_"+VER;
SITE_FILES = new Set(['./index.html',
    './index.js',
    './app.webmanifest',
    './images/icon.png',
    './lib/ui_popup.js', 
    './lib/ui_share_place.js', 
    './lib/utils.js', 
    './lib/video_ctrl.js',
    './style.css'
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
    // console.log("onFetch ", JSON.stringify(evt.request, null, '\t'));
    let resp = await caches.match(evt.request);
    if(resp) {
        log('hit cache ', evt.request.url, resp);
        return resp;
    } else {
        // default go to network
        log('fetch ', evt.request.url);
        return fetch(evt.request);
    }
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
