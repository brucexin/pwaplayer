
// Basic service worker...
self.addEventListener('fetch', (event) => {
 event.respondWith(caches.open('cache').then((cache) => {
  return cache.match(event.request).then((response) => {
   console.log("cache request: " + event.request.url);
   const fetchPromise = fetch(event.request).then((networkResponse) => {
   // If we got a response from the cache, update the cache...
   console.log("fetch completed: " + event.request.url, networkResponse);
   if (networkResponse) {
    console.debug("updated cached page: " + event.request.url, networkResponse);
    cache.put(event.request, networkResponse.clone());}
   return networkResponse;
  }, (event) => {
  // Rejected promise - just ignore it, we're offline...
  console.log("Error in fetch()", event);
  event.waitUntil(
   // Our 'cache' here is named *cache* in the caches.open()...
   caches.open('cache').then((cache) => {
    return cache.addAll
      ([
      // List : cache.addAll(), takes a list of URLs, then fetches them from...
      // The server and adds the response to the cache...
      './index.html', // cache your index page
      './index.js', // cache app.main css
      './app.webmanifest',
      './images/*',
      './lib/*'
     ]);
    }) );
   });
   // Respond from the cache, or the network...
   return response || fetchPromise;
 });
 }));
});

// async function doRequest(cache, event) {
//   let networkResponse = await fetch(event.request);
//   console.log("fetch completed: " + event.request.url, networkResponse);
//   if (networkResponse) {
//     console.debug("updated cached page: " + event.request.url, networkResponse);
//     cache.put(event.request, networkResponse.clone());
//   }
//   return networkResponse;
// }

// async function onFetch(event) {
//   let cache = null;
//   try {
//     cache = await caches.open('cache');
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
// self.addEventListener('fetch', (event) => {
//   event.respondWith(onFetch(event));
// });

// // Always updating i.e latest version available...
// self.addEventListener('install', (event) => {
//    self.skipWaiting();
//    console.log("Latest version installed!");
// });
