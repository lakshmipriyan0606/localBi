'use client';

import React from 'react';
import { Render } from '@measured/puck';
import { siteStudioPuckConfig } from '@/modules/page-builder/site-studio-puck-config';
import { PageContextProvider } from '@/modules/page-builder/page-context-react';
import type { PageContext } from '@/modules/page-builder/page-context-service';

export interface SitePageRendererProps {
  pageContext: PageContext;
  puckData: any;
}

export function SitePageRenderer({ pageContext, puckData }: SitePageRendererProps) {
  return (
    <PageContextProvider value={pageContext}>
      {/* Safe Brand Custom CSS Variables */}
      <style dangerouslySetInnerHTML={{ __html: pageContext.cssBlock }} />

      {/* Structured Tracking Identity Attribute for Workstream C */}
      <div
        data-localbi-context={JSON.stringify(pageContext.trackingContext)}
        className="space-y-8 animate-in fade-in duration-300"
      >
        <Render config={siteStudioPuckConfig} data={puckData} />
      </div>
    </PageContextProvider>
  );
}
