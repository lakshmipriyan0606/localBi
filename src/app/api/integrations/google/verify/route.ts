import { NextResponse } from 'next/server';
import { getGSCClient, getGA4Client } from '@/shared/lib/google-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ga4PropertyId, gscSiteUrl } = body;

    const results = {
      ga4: { success: false, message: '' },
      gsc: { success: false, message: '' },
    };

    // Test GA4 Connection
    if (ga4PropertyId) {
      try {
        const ga4Client = await getGA4Client();
        // Make a lightweight request to verify access
        await ga4Client.properties.runReport({
          property: `properties/${ga4PropertyId}`,
          requestBody: {
            dateRanges: [{ startDate: 'today', endDate: 'today' }],
            dimensions: [{ name: 'date' }],
            metrics: [{ name: 'sessions' }],
            limit: 1,
          },
        });
        results.ga4 = { success: true, message: 'Connected to GA4 successfully!' };
      } catch (error: any) {
        results.ga4 = { success: false, message: error.message || 'Failed to connect to GA4' };
      }
    }

    // Test GSC Connection
    if (gscSiteUrl) {
      try {
        const gscClient = await getGSCClient();
        // Make a lightweight request to verify access
        await gscClient.searchanalytics.query({
          siteUrl: gscSiteUrl,
          requestBody: {
            startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days ago
            endDate: new Date().toISOString().split('T')[0],
            dimensions: ['device'],
            rowLimit: 1,
          },
        });
        results.gsc = { success: true, message: 'Connected to GSC successfully!' };
      } catch (error: any) {
        results.gsc = { success: false, message: error.message || 'Failed to connect to GSC' };
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Error verifying Google connections:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
