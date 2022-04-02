var CACHE_NAME = "PWAPLAYER_CACHE_V1";
SITE_FILES = new Set(['./index.html', // cache your index page
    './index.js', // cache app.main css
    './app.webmanifest',
    './images/*',
    './lib/*', 
  ]);

// async function doRequest(cache, event) {
//   let networkResponse = await fetch(event.request);
//   console.log("fetch completed: " + event.request.url, networkResponse);
//   if (networkResponse) {
//     console.debug("updated cached page: " + event.request.url, networkResponse);
//     cache.put(event.request, networkResponse.clone());
//   }
//   return networkResponse;
// }

// async function cacheFetch(event) {
//   let cache = null;
//   try {
//     cache = await caches.open(CACHE_NAME);
//   } catch(err) {
//     console.log('open cache failed ', err);
//     return err;
//   }
  
//   try {
//     console.log('cache match');
//     let resp = await cache.match(event.request);
//     if(resp) {
//       return resp;
//     }
//   } catch(err) {
//     console.log('cache match failed ', event.request, err);
//     //return event.respondWith(err);
//   }

//   try {
//     console.log('network fetch');
//     let networkResp = await doRequest(cache, event);
//     return networkResp;
//   } catch(err) {
//     console.log("Error in fetch()", err);
//     event.waitUntil(cache.addAll([
//         // List : cache.addAll(), takes a list of URLs, then fetches them from...
//         // The server and adds the response to the cache...
//         './index.html', // cache your index page
//         './*.js', // cache app.main css
//         './app.webmanifest',
//         './images/*'
//         ])
//     );
//   }
// }

// async function directFetch(event) {

// }

async function onFetch(event) {
  console.log("onFetch ", JSON.stringify(event.request, null, '\t'));
  const url = new URL(event.request.url);
  const isCached = SITE_FILES.has(url.pathname);
  if(isCached) {
    let cache = await caches.open(CACHE_NAME);
    return cache.match(event.request.url);
  } else {
    // default go to network
    return;
  }
}

self.addEventListener('fetch', (event) => {
  event.respondWith(onFetch(event));
});

async function doInstall() {
  try {
    let cache = await caches.open(CACHE_NAME);
    cache.addAll(SITE_FILES);
    console.log("installed")
  } catch(err) {
    console.log("install error:", err);
    throw err;
  }
}

self.addEventListener('install', (event) => {
   event.waitUntil(doInstall());
   console.log("Latest version installed!");
});

// self.addEventListener('activate', (e) => {
//   e.waitUntil(caches.keys().then((keyList) => {
//     return Promise.all(keyList.map((key) => {
//       if (key === CACHE_NAME) { return; }
//       return caches.delete(key);
//     }))
//   }));
// });
