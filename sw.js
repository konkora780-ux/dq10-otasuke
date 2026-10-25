// オフライン対応。VERSIONを変えると新しい版に入れ替わります。
const VERSION="2026-10-25-9";
const FILES=["./", "index.html", "css/style.css", "manifest.webmanifest", "icons/icon-192.png", "js/config.js", "js/data.js", "js/data2.js", "js/data3.js", "js/data4.js", "js/app.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url); if(e.request.method!=="GET"||u.origin!==location.origin) return;
 e.respondWith(fetch(e.request).then(r=>{const cp=r.clone(); caches.open(VERSION).then(c=>c.put(e.request,cp)); return r;}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match("index.html"))));});
