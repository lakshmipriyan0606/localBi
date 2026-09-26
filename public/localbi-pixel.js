/**
 * LocalBi Intelligent Visitor Pixel (Cookieless Real Device Fingerprinting & Identity Resolution)
 * Captures real browser hardware, canvas hash, screen, timezone, intent signals, and stitches anonymous sessions to customer identities.
 */
(function (window, document) {
  'use strict';

  // 1. Determine Tenant Slug
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('localbi-pixel.js') !== -1) {
        return scripts[i];
      }
    }
    return scripts[scripts.length - 1];
  })();

  var tenantSlug = (currentScript && currentScript.getAttribute('data-tenant')) || '';
  if (!tenantSlug) {
    var pathMatch = window.location.pathname.match(/\/site\/([^/?#]+)/);
    if (pathMatch && pathMatch[1]) {
      tenantSlug = pathMatch[1];
    } else {
      var urlParams = new URLSearchParams(window.location.search);
      tenantSlug = urlParams.get('tenant') || 'lakshmi-food';
    }
  }

  var endpoint = '/api/v1/pixel/track';

  // 2. Real OS & Browser Detection
  function getDetailedDeviceInfo() {
    var ua = navigator.userAgent;
    var platform = navigator.platform || '';
    var os = 'Unknown OS';
    var browser = 'Unknown Browser';

    // OS Detection
    if (/Windows NT 10.0/i.test(ua)) os = 'Windows 11 / 10';
    else if (/Windows NT 6.3/i.test(ua)) os = 'Windows 8.1';
    else if (/Windows NT 6.1/i.test(ua)) os = 'Windows 7';
    else if (/iPhone/i.test(ua)) os = 'iOS (Apple iPhone)';
    else if (/iPad/i.test(ua)) os = 'iOS (Apple iPad)';
    else if (/Android/i.test(ua)) {
      var match = ua.match(/Android\s([0-9\.]+)/i);
      os = 'Android ' + (match ? match[1] : 'Device');
    } else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS (Desktop)';
    else if (/Linux/i.test(ua)) os = 'Linux';

    // Browser Detection
    if (/Edg\//i.test(ua)) {
      var edgMatch = ua.match(/Edg\/([0-9]+)/);
      browser = 'Microsoft Edge ' + (edgMatch ? edgMatch[1] : '');
    } else if (/Chrome\//i.test(ua) && !/Chromium|OPR/i.test(ua)) {
      var chromeMatch = ua.match(/Chrome\/([0-9]+)/);
      browser = 'Google Chrome ' + (chromeMatch ? chromeMatch[1] : '');
    } else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) {
      var safMatch = ua.match(/Version\/([0-9\.]+)/);
      browser = 'Apple Safari ' + (safMatch ? safMatch[1] : '');
    } else if (/Firefox\//i.test(ua)) {
      var ffMatch = ua.match(/Firefox\/([0-9]+)/);
      browser = 'Mozilla Firefox ' + (ffMatch ? ffMatch[1] : '');
    } else {
      browser = navigator.userAgent.substring(0, 30);
    }

    var screenRes = window.screen.width + 'x' + window.screen.height;
    var tz = 'Asia/Kolkata';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    } catch (e) {}

    return {
      os: os,
      browser: browser,
      screenResolution: screenRes,
      timezone: tz,
    };
  }

  // 3. Generate Cookieless Hardware & Canvas Fingerprint
  function getFingerprint() {
    var cached = null;
    try {
      cached = localStorage.getItem('_lbi_fp');
    } catch (e) {}
    if (cached) return cached;

    var canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    var ctx = canvas.getContext('2d');
    var hash = 0;

    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('LocalBi-Identity-Resolution-Engine', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Cookieless-Fingerprint', 4, 17);

      var str = canvas.toDataURL() + navigator.userAgent + screen.width + 'x' + screen.height + (new Date()).getTimezoneOffset();
      for (var i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
    } else {
      hash = Math.floor(Math.random() * 1000000000);
    }

    var fp = 'fp_' + Math.abs(hash).toString(16) + Math.random().toString(16).substring(2, 8);
    try {
      localStorage.setItem('_lbi_fp', fp);
    } catch (e) {}
    return fp;
  }

  var fingerprint = getFingerprint();
  var deviceInfo = getDetailedDeviceInfo();
  var startTime = Date.now();

  // 4. Dispatch telemetry beacon to server
  function sendBeacon(payload) {
    payload.tenantSlug = tenantSlug;
    payload.deviceFingerprint = fingerprint;
    payload.platform = deviceInfo.os;
    payload.browser = deviceInfo.browser;
    payload.screenResolution = deviceInfo.screenResolution;
    payload.timezone = deviceInfo.timezone;
    payload.referrer = document.referrer || '';
    payload.url = window.location.pathname;
    payload.title = document.title || 'Microsite';

    var data = JSON.stringify(payload);

    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
      } else {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', endpoint, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(data);
      }
    } catch (err) {
      console.warn('LocalBi pixel beacon failed:', err);
    }
  }

  // 5. Track Initial Page View
  sendBeacon({
    eventType: 'page_view',
    dwellTimeSeconds: 15,
  });

  // 6. Check URL params for immediate identity resolution (e.g. ?phone=+919840123456&name=Priya)
  try {
    var searchParams = new URLSearchParams(window.location.search);
    var phoneParam = searchParams.get('phone') || searchParams.get('mobile');
    var nameParam = searchParams.get('name');
    if (phoneParam) {
      sendBeacon({
        eventType: 'identify',
        identifiedUser: {
          phone: phoneParam,
          name: nameParam || 'Customer',
        },
      });
    }
  } catch (e) {}

  // 7. Automatic Intent Listeners (Clicks on WhatsApp / Call buttons)
  document.addEventListener('click', function (e) {
    var target = e.target;
    while (target && target !== document) {
      if (target.tagName === 'A') {
        var href = target.getAttribute('href') || '';
        if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp.com') !== -1) {
          sendBeacon({ eventType: 'whatsapp_click' });
        } else if (href.indexOf('tel:') !== -1) {
          sendBeacon({ eventType: 'phone_call' });
        }
      }
      target = target.parentNode;
    }
  }, true);

  // 8. Track dwell time on page unload
  window.addEventListener('beforeunload', function () {
    var dwellSec = Math.round((Date.now() - startTime) / 1000);
    if (dwellSec > 5) {
      sendBeacon({
        eventType: 'page_view',
        dwellTimeSeconds: dwellSec,
      });
    }
  });

  // 9. Expose Global Public SDK for interactive calls
  window.LocalBi = {
    getFingerprint: function () {
      return fingerprint;
    },
    getDeviceInfo: function () {
      return deviceInfo;
    },
    track: function (eventType, metadata) {
      sendBeacon({
        eventType: eventType,
        metadata: metadata,
      });
    },
    identify: function (user) {
      sendBeacon({
        eventType: 'identify',
        identifiedUser: user,
      });
    },
  };
})(window, document);
