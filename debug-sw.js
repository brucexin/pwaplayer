// Basic service worker...
var CACHE_NAME = "PWAPLAYER_CACHE_V1";

self.addEventListener('fetch', (event) => {
 console.log('open cache ', CACHE_NAME);
 event.respondWith(caches.open(CACHE_NAME).then((cache) => {
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
   // Our CACHE_NAME here is named *cache* in the caches.open()...
   caches.open(CACHE_NAME).then((cache) => {
    return cache.addAll
      ([
      // List : cache.addAll(), takes a list of URLs, then fetches them from...
      // The server and adds the response to the cache...
      './index.html', // cache your index page
      './pwa.js', // cache app.main css
      './app.webmanifest',
      './images/*'
     ]);
    }) );
   });
   // Respond from the cache, or the network...
   return response || fetchPromise;
 });
 }));
});