// Runs before the app bundle. After a deploy, a cached HTML shell can point at hashed
// files that no longer exist, which leaves a blank page. When one of our own /assets/
// files fails to load, drop the service worker and its caches and reload once.
(function () {
  var KEY = "nexus-stale-entry-reload";
  var WINDOW_MS = 30000;
  window.addEventListener("error", function (event) {
    var target = event.target;
    if (!target || (target.tagName !== "SCRIPT" && target.tagName !== "LINK")) return;
    var url = target.src || target.href || "";
    if (url.indexOf(location.origin + "/assets/") !== 0) return;
    var last = 0;
    try { last = Number(sessionStorage.getItem(KEY)) || 0; } catch (e) { /* storage blocked */ }
    if (Date.now() - last < WINDOW_MS) return;
    try { sessionStorage.setItem(KEY, String(Date.now())); } catch (e) { /* best effort */ }
    var workers = navigator.serviceWorker && navigator.serviceWorker.getRegistrations
      ? navigator.serviceWorker.getRegistrations().then(function (list) { return Promise.all(list.map(function (r) { return r.unregister(); })); })
      : Promise.resolve();
    var caches_ = window.caches && caches.keys
      ? caches.keys().then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      : Promise.resolve();
    Promise.all([workers, caches_]).catch(function () {}).then(function () { location.reload(); });
  }, true);
})();
