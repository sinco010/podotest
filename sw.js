self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('push',function(e){
  var d={};try{d=e.data?e.data.json():{}}catch(x){d={body:e.data&&e.data.text()}}
  e.waitUntil(self.registration.showNotification(d.title||'포도 시세표',{
    body:d.body||'새 시세가 올라왔어요',icon:'/icon-192.png',badge:'/icon-192.png',
    tag:'podo-update',renotify:true,data:{url:d.url||'/'}}));
});
self.addEventListener('notificationclick',function(e){
  e.notification.close();
  var u=(e.notification.data&&e.notification.data.url)||'/';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(l){
    for(var i=0;i<l.length;i++){if('focus' in l[i]){l[i].navigate&&l[i].navigate(u);return l[i].focus()}}
    return self.clients.openWindow(u)}));
});
