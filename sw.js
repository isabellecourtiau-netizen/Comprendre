/* Micro-gestes : fonctionnement hors connexion */
var V='mg-v2';
var FILES=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png','favicon-32.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(V).then(function(c){return c.addAll(FILES)}).then(function(){return self.skipWaiting()}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==V}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}));});
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  var u=new URL(e.request.url);
  if(u.origin!==location.origin){ // polices : cache au passage
    e.respondWith(caches.match(e.request).then(function(r){return r||fetch(e.request).then(function(n){var c=n.clone();caches.open(V).then(function(ca){ca.put(e.request,c)});return n}).catch(function(){return r})}));return;}
  // page : réseau d'abord pour recevoir les mises à jour, cache si hors connexion
  if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(function(n){var c=n.clone();caches.open(V).then(function(ca){ca.put('index.html',c)});return n}).catch(function(){return caches.match('index.html')}));return;}
  e.respondWith(caches.match(e.request).then(function(r){return r||fetch(e.request)}));
});
