'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import type { TrackingContextDto } from '@/modules/page-builder/page-context-service';

export type LocalBiEventType =
  | 'localbi_page_view'
  | 'page_view'
  | 'click_call'
  | 'whatsapp_click'
  | 'directions_click'
  | 'lead_form_submit'
  | 'form_submit'
  | 'booking_start'
  | 'booking_complete'
  | 'cta_click'
  | 'heartbeat';

export interface LocalBiEventParams {
  brand?: string | undefined;
  brandId?: string | undefined;
  surface?: string | undefined;
  webSurfaceId?: string | undefined;
  pageType?: string | undefined;
  pageId?: string | undefined;
  storeId?: string | undefined;
  storeName?: string | undefined;
  productId?: string | undefined;
  productName?: string | undefined;
  categoryId?: string | undefined;
  path?: string | undefined;
  activeDeltaMs?: number | undefined;
  pageViewId?: string | undefined;
  [key: string]: unknown;
}

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    __localbi_ga_initialized?: boolean;
    __localbi_active_measurement_id?: string;
    LocalBi?: {
      track: (eventType: string, metadata?: Record<string, unknown>) => void;
      getVisitorId: () => string;
      getSessionId: () => string;
      flush: () => void;
    };
  }
}

/**
 * Standardized, safe LocalBi client-side tracker.
 * Enforces single GA4 initialization, zero PII transmission, opaque anonymous identity,
 * and accurate Active Engagement measurement.
 */
export class LocalBiTracker {
  private static readonly FORBIDDEN_KEYS = new Set([
    'email',
    'phone',
    'phonenumber',
    'telephone',
    'name',
    'username',
    'fullname',
    'password',
    'token',
    'secret',
    'refreshtoken',
    'accesstoken',
    'rawpayload',
    'formpayload',
    'notes',
    'message',
  ]);

  private static currentPvId: string = '';

  /**
   * Initializes GA4 measurement script once for the active WebSurface.
   * Never injects duplicate scripts or overwrites existing initialization.
   */
  public static init(measurementId: string | null | undefined): void {
    if (typeof window === 'undefined') return;
    if (!measurementId || !measurementId.startsWith('G-')) return;

    if (window.__localbi_ga_initialized && window.__localbi_active_measurement_id === measurementId) {
      return;
    }

    window.dataLayer = window.dataLayer || [];
    function gtag(..._args: any[]) {
      window.dataLayer!.push(arguments);
    }
    window.gtag = window.gtag || gtag;

    const scriptId = `ga4-script-${measurementId}`;
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      document.head.appendChild(script);

      window.gtag('js', new Date());
      window.gtag('config', measurementId, {
        send_page_view: false,
      });
    }

    window.__localbi_ga_initialized = true;
    window.__localbi_active_measurement_id = measurementId;
  }

  /**
   * Sanitizes payload to ensure NO personal data (names, emails, phones) or raw form payloads are sent.
   */
  public static sanitizeParams(params: LocalBiEventParams): Record<string, string | number | boolean> {
    const clean: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(params)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (this.FORBIDDEN_KEYS.has(lowerKey)) {
        continue;
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        clean[key] = value;
      }
    }

    return clean;
  }

  private static generateRandomHex(length: number): string {
    let rand = '';
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const buf = new Uint8Array(length / 2);
      window.crypto.getRandomValues(buf);
      for (let i = 0; i < buf.length; i++) {
        rand += ('0' + buf[i].toString(16)).slice(-2);
      }
    } else {
      for (let j = 0; j < length; j++) {
        rand += Math.floor(Math.random() * 16).toString(16);
      }
    }
    return rand;
  }

  private static getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  private static setCookie(name: string, value: string, days: number): void {
    if (typeof document === 'undefined') return;
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
  }

  /**
   * Returns or creates the anonymous first-party visitor ID (lb_vid).
   * Opaque random identifier, stored in 365-day cookie with localStorage resilience.
   */
  public static getVisitorId(): string {
    if (typeof window === 'undefined') return '';
    try {
      let vid = this.getCookie('lb_vid');
      if (!vid) {
        vid = localStorage.getItem('lb_vid');
      }
      if (!vid || vid.length < 8) {
        vid = `vid_${this.generateRandomHex(32)}`;
      }
      this.setCookie('lb_vid', vid, 365);
      localStorage.setItem('lb_vid', vid);
      return vid;
    } catch {
      return '';
    }
  }

  /**
   * Returns or creates the session ID (lb_sid).
   * Stored in session cookie with sessionStorage resilience.
   */
  public static getSessionId(): string {
    if (typeof window === 'undefined') return '';
    try {
      let sid = this.getCookie('lb_sid');
      if (!sid) {
        sid = sessionStorage.getItem('lb_sid');
      }
      if (!sid || sid.length < 8) {
        sid = `sid_${this.generateRandomHex(32)}`;
      }
      this.setCookie('lb_sid', sid, 1);
      sessionStorage.setItem('lb_sid', sid);
      return sid;
    } catch {
      return '';
    }
  }

  public static getOrCreatePageViewId(): string {
    if (!this.currentPvId) {
      this.currentPvId = `pv_${this.generateRandomHex(32)}`;
    }
    return this.currentPvId;
  }

  public static resetPageViewId(): string {
    this.currentPvId = `pv_${this.generateRandomHex(32)}`;
    return this.currentPvId;
  }

  /**
   * Dispatches a standardized LocalBi event to GA4 dataLayer and LocalBi internal database.
   */
  public static track(eventName: LocalBiEventType, params: LocalBiEventParams): void {
    if (typeof window === 'undefined') return;

    const sanitized = this.sanitizeParams(params);

    // 1. Dispatch to GA4 dataLayer (with surface taxonomy)
    if (window.gtag) {
      window.gtag('event', eventName, sanitized);
    } else if (window.dataLayer) {
      window.dataLayer.push({ event: eventName, ...sanitized });
    }

    // 2. Dispatch to LocalBi Internal Event Ingestion API
    try {
      const visitorId = this.getVisitorId();
      const sessionId = this.getSessionId();
      const pageViewId = params.pageViewId || this.getOrCreatePageViewId();

      const payload = JSON.stringify({
        eventType: eventName,
        visitorId,
        sessionId,
        pageViewId,
        brandId: params.brandId,
        webSurfaceId: params.webSurfaceId,
        pageId: params.pageId,
        pageType: params.pageType,
        storeId: params.storeId,
        productId: params.productId,
        categoryId: params.categoryId,
        url: window.location.pathname,
        referrer: document.referrer || undefined,
        activeDeltaMs: params.activeDeltaMs,
        metadata: sanitized,
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/v1/pixel/track', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/v1/pixel/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Fire-and-forget: never break client-side execution
    }
  }
}

/**
 * Runtime component rendered once per WebSurface page layout.
 * Connects PageContext tracking context to LocalBi & GA4 without draggable Puck components.
 * Manages active engagement timing, tab visibility, idle detection, and route transition flushes.
 */
export function LocalBiAnalyticsRuntime({
  trackingContext,
}: {
  trackingContext?: TrackingContextDto | undefined;
}) {
  const pathname = usePathname();
  const lastTrackedPathRef = useRef<string | null>(null);

  // Active engagement timing references
  const pendingActiveMsRef = useRef<number>(0);
  const lastTickRef = useRef<number>(Date.now());
  const isVisibleRef = useRef<boolean>(true);
  const isIdleRef = useRef<boolean>(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const flushHeartbeat = () => {
    const now = Date.now();
    const delta = now - lastTickRef.current;
    lastTickRef.current = now;

    if (isVisibleRef.current && !isIdleRef.current && delta > 0 && delta < 5000) {
      pendingActiveMsRef.current += delta;
    }

    if (pendingActiveMsRef.current < 500) return;

    const deltaToSend = Math.round(pendingActiveMsRef.current);
    pendingActiveMsRef.current = 0;

    LocalBiTracker.track('heartbeat', {
      brandId: trackingContext?.brandId,
      webSurfaceId: trackingContext?.webSurfaceId,
      pageId: trackingContext?.pageId,
      pageType: trackingContext?.pageType,
      storeId: trackingContext?.storeId,
      productId: trackingContext?.productId,
      activeDeltaMs: deltaToSend,
      pageViewId: LocalBiTracker.getOrCreatePageViewId(),
    });
  };

  const resetIdle = () => {
    if (isIdleRef.current) {
      isIdleRef.current = false;
      lastTickRef.current = Date.now();
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      if (isVisibleRef.current && delta > 0 && delta < 5000) {
        pendingActiveMsRef.current += delta;
      }
      isIdleRef.current = true;
    }, 60000); // 60s idle threshold
  };

  // Set up listeners for engagement timing
  useEffect(() => {
    if (typeof window === 'undefined') return;

    isVisibleRef.current = document.visibilityState === 'visible';
    lastTickRef.current = Date.now();
    resetIdle();

    const onVisibilityChange = () => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      if (document.visibilityState === 'hidden') {
        if (isVisibleRef.current && !isIdleRef.current && delta > 0 && delta < 5000) {
          pendingActiveMsRef.current += delta;
        }
        isVisibleRef.current = false;
        flushHeartbeat();
      } else {
        isVisibleRef.current = true;
        lastTickRef.current = Date.now();
        resetIdle();
      }
    };

    const onFocus = () => {
      isVisibleRef.current = true;
      lastTickRef.current = Date.now();
      resetIdle();
    };

    const onBlur = () => {
      flushHeartbeat();
    };

    const onPageHide = () => {
      flushHeartbeat();
    };

    const interactionEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    const handleInteraction = () => resetIdle();
    interactionEvents.forEach((evt) => window.addEventListener(evt, handleInteraction, { passive: true }));

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pagehide', onPageHide);

    const heartbeatInterval = setInterval(() => {
      if (isVisibleRef.current && !isIdleRef.current) {
        flushHeartbeat();
      }
    }, 20000); // 20s bounded heartbeat

    return () => {
      clearInterval(heartbeatInterval);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pagehide', onPageHide);
      interactionEvents.forEach((evt) => window.removeEventListener(evt, handleInteraction));
    };
  }, []);

  // Track pageview on initial mount or route navigation
  useEffect(() => {
    if (!trackingContext) return;

    if (trackingContext.ga4MeasurementId) {
      LocalBiTracker.init(trackingContext.ga4MeasurementId);
    }

    if (lastTrackedPathRef.current !== pathname) {
      // Flush any pending active time from previous route
      if (lastTrackedPathRef.current !== null) {
        flushHeartbeat();
        LocalBiTracker.resetPageViewId();
      }

      lastTrackedPathRef.current = pathname;
      pendingActiveMsRef.current = 0;
      lastTickRef.current = Date.now();

      LocalBiTracker.track('localbi_page_view', {
        brand: trackingContext.brandName || trackingContext.brandId,
        brandId: trackingContext.brandId,
        surface: trackingContext.webSurfaceType || 'LOCALBI',
        webSurfaceId: trackingContext.webSurfaceId,
        pageId: trackingContext.pageId,
        pageType: trackingContext.pageType,
        storeId: trackingContext.storeId,
        storeName: trackingContext.storeName,
        productId: trackingContext.productId,
        productName: trackingContext.productName,
        categoryId: trackingContext.categoryId,
        pageViewId: LocalBiTracker.getOrCreatePageViewId(),
      });
    }
  }, [pathname, trackingContext]);

  return null;
}
