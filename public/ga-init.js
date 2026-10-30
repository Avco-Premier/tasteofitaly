// GA4 without an inline script (CSP stays script-src 'self') and after the page has loaded,
// so analytics never competes with the hero image or first interaction.
(function () {
  var s = document.currentScript;
  var id = s && s.dataset.gaId;
  if (!id) return;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', id);
  function load() {
    var t = document.createElement('script');
    t.async = true;
    t.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(t);
  }
  var idle = window.requestIdleCallback || function (cb) { setTimeout(cb, 1500); };
  if (document.readyState === 'complete') idle(load);
  else window.addEventListener('load', function () { idle(load); });
})();
