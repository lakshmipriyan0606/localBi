'use client';

import { useEffect, useRef } from 'react';
import type { TrackingContextDto } from '@/modules/page-builder/page-context-service';

export type LocalBiEventType =
  | 'localbi_page_view'
  | 'click_call'
  | 'whatsapp_click'
  | 'directions_click'
  | 'lead_form_submit'
  | 'booking_start'
  | 'booking_complete';

export interface LocalBiEventParams {
  brand?: string | undefined;
  brandId?: string | undefined;
  surface?: string | undefined;
  webSurfaceId?: string | undefined;
  pageType?: string | undefined;
  storeId?: string | undefined;
  storeName?: string | undefined;
  productId?: string | undefined;
  productName?: string | undefined;
  categoryId?: string | undefined;
  path?: string | undefined;
  [key: string]: unknown;
}

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    __localbi_ga_initialized?: boolean;
    __localbi_active_measurement_id?: string;
  }
}

/**
 * Standardized, safe LocalBi client-side tracker.
 * Enforces single GA4 initialization, zero PII transmission, and canonical event taxonomy.
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

    // Check if script element already exists in document
    const scriptId = `ga4-script-${measurementId}`;
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      document.head.appendChild(script);

      window.gtag('js', new Date());
      window.gtag('config', measurementId, {
        send_page_view: false, // Page views tracked explicitly with surface taxonomy
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
        continue; // Strictly omit PII
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        clean[key] = value;
      }
    }

    return clean;
  }

  public static getVisitorId(): string {
    if (typeof window === 'undefined') return '';
    try {
      let vid = localStorage.getItem('lb_vid');
      if (!vid) {
        vid = 'v_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        localStorage.setItem('lb_vid', vid);
      }
      return vid;
    } catch {
      return '';
    }
  }

  public static getSessionId(): string {
    if (typeof window === 'undefined') return '';
    try {
      let sid = sessionStorage.getItem('lb_sid');
      if (!sid) {
        sid = 's_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        sessionStorage.setItem('lb_sid', sid);
      }
      return sid;
    } catch {
      return '';
    }
  }

  /**
   * Dispatches a standardized LocalBi event to GA4 dataLayer and LocalBi internal database.
   */
  public static track(eventName: LocalBiEventType, params: LocalBiEventParams): void {
    if (typeof window === 'undefined') return;

    const sanitized = this.sanitizeParams(params);

    // 1. Dispatch to GA4 dataLayer
    if (window.gtag) {
      window.gtag('event', eventName, sanitized);
    } else if (window.dataLayer) {
      window.dataLayer.push({ event: eventName, ...sanitized });
    }

    // 2. Dispatch to LocalBi Internal Event Ingestion API
    try {
      const visitorId = this.getVisitorId();
      const sessionId = this.getSessionId();
      const payload = JSON.stringify({
        eventType: eventName,
        visitorId,
        sessionId,
        brandId: params.brandId,
        webSurfaceId: params.webSurfaceId,
        storeId: params.storeId,
        productId: params.productId,
        categoryId: params.categoryId,
        pageType: params.pageType,
        url: window.location.pathname,
        referrer: document.referrer || undefined,
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
 * Connects PageContext tracking context to Google Analytics without draggable Puck components.
 */
export function LocalBiAnalyticsRuntime({
  trackingContext,
}: {
  trackingContext?: TrackingContextDto | undefined;
}) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!trackingContext) return;

    if (trackingContext.ga4MeasurementId) {
      LocalBiTracker.init(trackingContext.ga4MeasurementId);
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      LocalBiTracker.track('localbi_page_view', {
        brand: trackingContext.brandName || trackingContext.brandId,
        brandId: trackingContext.brandId,
        surface: trackingContext.webSurfaceType || 'LOCALBI',
        webSurfaceId: trackingContext.webSurfaceId,
        pageType: trackingContext.pageType,
        storeId: trackingContext.storeId,
        storeName: trackingContext.storeName,
        productId: trackingContext.productId,
        productName: trackingContext.productName,
        categoryId: trackingContext.categoryId,
      });
    }
  }, [trackingContext]);

  return null;
}
