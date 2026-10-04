/**
 * LocalBi First-Party Web Analytics Tracker
 * Privacy-preserving, non-invasive visitor intelligence.
 * No canvas/audio/font fingerprinting.
 * Accurate Active Engagement timing (visibility + idle detection + sendBeacon flush).
 */
(function (window, document) {
  'use strict';

  if (window.__localbi_tracker_loaded) return;
  window.__localbi_tracker_loaded = true;

  // 1. Script & Context Detection
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && (scripts[i].src.indexOf('localbi-tracker.js') !== -1 || scripts[i].src.indexOf('localbi-pixel.js') !== -1)) {
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
      tenantSlug = urlParams.get('tenant') || '';
    }
  }

  var endpoint = '/api/v1/pixel/track';

  // 2. Cookie & Identity Management
  function getCookie(name) {
    try {
      var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : null;
    } catch (e) {
      return null;
    }
  }

  function setCookie(name, value, days) {
    try {
      var expires = '';
      if (days) {
        var date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = '; expires=' + date.toUTCString();
      }
      document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax';
    } catch (e) {}
  }

  function generateOpaqueId(prefix) {
    var rand = '';
    if (window.crypto && window.crypto.getRandomValues) {
      var buf = new Uint8Array(16);
      window.crypto.getRandomValues(buf);
      for (var i = 0; i < buf.length; i++) {
        rand += ('0' + buf[i].toString(16)).slice(-2);
      }
    } else {
      for (var j = 0; j < 32; j++) {
        rand += Math.floor(Math.random() * 16).toString(16);
      }
    }
    return prefix + '_' + rand;
  }

  // First-party Visitor ID (lb_vid)
  function getOrCreateVisitorId() {
    var vid = getCookie('lb_vid');
    if (!vid) {
      try {
        vid = localStorage.getItem('lb_vid');
      } catch (e) {}
    }
    if (!vid || vid.length < 8) {
      vid = generateOpaqueId('vid');
    }
    setCookie('lb_vid', vid, 365);
    try {
      localStorage.setItem('lb_vid', vid);
    } catch (e) {}
    return vid;
  }

  // First-party Session ID (lb_sid)
  function getOrCreateSessionId() {
    var sid = getCookie('lb_sid');
    if (!sid) {
      try {
        sid = sessionStorage.getItem('lb_sid');
      } catch (e) {}
    }
    if (!sid || sid.length < 8) {
      sid = generateOpaqueId('sid');
    }
    setCookie('lb_sid', sid, 1); // 1-day max session cookie
    try {
      sessionStorage.setItem('lb_sid', sid);
    } catch (e) {}
    return sid;
  }

  var visitorId = getOrCreateVisitorId();
  var sessionId = getOrCreateSessionId();
  var currentPageViewId = generateOpaqueId('pv');

  // 3. Read Workstream B data-localbi-context from DOM
  function getPageContext() {
    try {
      var el = document.querySelector('[data-localbi-context]');
      if (el) {
        var raw = el.getAttribute('data-localbi-context');
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {}
    return {};
  }

  // 4. Coarse Device Information
  function getCoarseDeviceInfo() {
    var ua = navigator.userAgent || '';
    var platform = 'DESKTOP';
    if (/tablet|ipad|playbook|silk/i.test(ua)) platform = 'TABLET';
    else if (/mobile|iphone|ipod|android/i.test(ua)) platform = 'MOBILE';

    var screenRes = window.screen ? window.screen.width + 'x' + window.screen.height : 'Unknown';
    var tz = 'UTC';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (e) {}

    return {
      platform: platform,
      browser: ua.substring(0, 40),
      screenResolution: screenRes,
      timezone: tz,
    };
  }

  var deviceInfo = getCoarseDeviceInfo();

  // 5. Transmission Helper
  function sendBeacon(payload) {
    payload.tenantSlug = tenantSlug;
    payload.visitorId = visitorId;
    payload.sessionId = sessionId;
    payload.pageViewId = currentPageViewId;
    payload.url = window.location.pathname;
    payload.title = document.title || 'Page';
    payload.referrer = document.referrer || '';
    payload.platform = deviceInfo.platform;
    payload.browser = deviceInfo.browser;
    payload.screenResolution = deviceInfo.screenResolution;
    payload.timezone = deviceInfo.timezone;
    payload.clientOccurredAt = new Date().toISOString();

    // Attach Workstream B Page Context
    var ctx = getPageContext();
    if (ctx.webSurfaceId) payload.webSurfaceId = ctx.webSurfaceId;
    if (ctx.brandId) payload.brandId = ctx.brandId;
    if (ctx.pageId) payload.pageId = ctx.pageId;
    if (ctx.pageType) payload.pageType = ctx.pageType;
    if (ctx.storeId) payload.storeId = ctx.storeId;
    if (ctx.productId) payload.productId = ctx.productId;
    if (ctx.categoryId) payload.categoryId = ctx.categoryId;

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
      // Fire-and-forget
    }
  }

  // 6. Accurate Active Engagement Engine
  var isVisible = document.visibilityState === 'visible';
  var isIdle = false;
  var lastTickTime = Date.now();
  var pendingActiveMs = 0;
  var idleTimer = null;
  var IDLE_TIMEOUT_MS = 60000; // 60 seconds
  var HEARTBEAT_INTERVAL_MS = 20000; // 20 seconds

  function tickActiveTime() {
    var now = Date.now();
    var delta = now - lastTickTime;
    lastTickTime = now;

    // Accumulate ONLY if tab is currently visible and user is not idle
    if (isVisible && !isIdle && delta > 0 && delta < 5000) {
      pendingActiveMs += delta;
    }
  }

  function flushHeartbeat() {
    tickActiveTime();
    if (pendingActiveMs < 500) return; // Ignore trivial flickers

    var deltaToSend = Math.round(pendingActiveMs);
    pendingActiveMs = 0;

    sendBeacon({
      eventType: 'heartbeat',
      isHeartbeat: true,
      activeDeltaMs: deltaToSend,
    });
  }

  function resetIdle() {
    if (isIdle) {
      isIdle = false;
      lastTickTime = Date.now();
    }
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      tickActiveTime();
      isIdle = true;
    }, IDLE_TIMEOUT_MS);
  }

  // Interaction listeners for idle detection (lightweight)
  var interactionEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
  for (var i = 0; i < interactionEvents.length; i++) {
    window.addEventListener(interactionEvents[i], resetIdle, { passive: true });
  }
  resetIdle();

  // Visibility and Focus changes
  document.addEventListener('visibilitychange', function () {
    tickActiveTime();
    if (document.visibilityState === 'hidden') {
      isVisible = false;
      flushHeartbeat();
    } else {
      isVisible = true;
      lastTickTime = Date.now();
      resetIdle();
    }
  });

  window.addEventListener('focus', function () {
    tickActiveTime();
    isVisible = true;
    lastTickTime = Date.now();
    resetIdle();
  });

  window.addEventListener('blur', function () {
    tickActiveTime();
    // Do not mark hidden on window blur, but flush active progress
    flushHeartbeat();
  });

  // Regular bounded heartbeat (every 20s)
  setInterval(function () {
    if (isVisible && !isIdle) {
      flushHeartbeat();
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Exit flush on pagehide
  window.addEventListener('pagehide', function () {
    tickActiveTime();
    flushHeartbeat();
  });

  // 7. Track Initial Logical Page View
  sendBeacon({
    eventType: 'page_view',
  });

  // 8. Intent & Conversion Click Delegation (WhatsApp, Call, Directions, Form)
  document.addEventListener('click', function (e) {
    var target = e.target;
    while (target && target !== document) {
      if (target.tagName === 'A' || target.tagName === 'BUTTON') {
        var href = (target.getAttribute('href') || '').toLowerCase();
        var dataAction = target.getAttribute('data-action') || '';

        if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp.com') !== -1 || dataAction === 'whatsapp') {
          sendBeacon({ eventType: 'whatsapp_click' });
          return;
        } else if (href.indexOf('tel:') !== -1 || dataAction === 'call') {
          sendBeacon({ eventType: 'call_click' });
          return;
        } else if (href.indexOf('maps.google.com') !== -1 || href.indexOf('google.com/maps') !== -1 || dataAction === 'directions') {
          sendBeacon({ eventType: 'directions_click' });
          return;
        } else if (dataAction === 'cta') {
          sendBeacon({ eventType: 'cta_click' });
          return;
        }
      }
      target = target.parentNode;
    }
  }, true);

  // Form Submission tracking
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form && form.tagName === 'FORM') {
      sendBeacon({
        eventType: 'form_submit',
        metadata: {
          formId: form.id || form.getAttribute('name') || 'contact_form',
        },
      });
    }
  }, true);

  // 9. Public API on window.LocalBi
  window.LocalBi = {
    getVisitorId: function () {
      return visitorId;
    },
    getSessionId: function () {
      return sessionId;
    },
    getPageViewId: function () {
      return currentPageViewId;
    },
    track: function (eventType, metadata) {
      sendBeacon({
        eventType: eventType,
        metadata: metadata,
      });
    },
    flush: function () {
      flushHeartbeat();
    },
  };
})(window, document);
