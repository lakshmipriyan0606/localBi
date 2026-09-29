import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { prisma } = await import('@/shared/database/client');
    const { GoogleOAuthService } = await import('@/modules/integrations/google/google-oauth-service');
    
    // Find Lakshmi Food tenant
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'lakshmi-food' } });
    if (!tenant) return NextResponse.json({ 
      error: 'Tenant lakshmi-food not found in DB!', 
      databaseUrl: process.env['DATABASE_URL'] 
    });

    // Find first mapped location
    let locMappings = await prisma.internalResourceMapping.findMany({
      where: { tenantId: tenant.id, internalType: 'LOCATION' },
      include: { resource: true }
    });
    
    if (locMappings.length === 0) {
      // Try to auto-map it!
      const location = await prisma.location.findFirst({ where: { tenantId: tenant.id } });
      const resource = await prisma.externalResource.findFirst({ where: { tenantId: tenant.id, resourceType: 'LOCATION' } });
      if (location && resource) {
        await prisma.internalResourceMapping.create({
          data: {
            tenantId: tenant.id,
            internalType: 'LOCATION',
            internalId: location.id,
            resourceId: resource.id,
          }
        });
        locMappings = await prisma.internalResourceMapping.findMany({
          where: { tenantId: tenant.id, internalType: 'LOCATION' },
          include: { resource: true }
        });
      } else {
        return NextResponse.json({ 
          error: 'Could not auto-map because a required record is missing in the database.',
          missingInternalLocation: !location,
          missingExternalResource: !resource,
          tenantId: tenant.id
        });
      }
    }

    const mapping = locMappings[0];
    if (!mapping) {
      return NextResponse.json({ error: 'No location mapping found' });
    }

    // Find Google connection
    const allConnections = await prisma.integrationConnection.findMany({ where: { tenantId: tenant.id } });
    const connection = allConnections.find(c => c.status === 'ACTIVE');
    
    if (!connection) {
      return NextResponse.json({ 
        error: 'No active Google Connection found in DB!',
        allConnectionsFound: allConnections
      });
    }

    // Find account
    const accounts = await prisma.externalAccount.findMany({ where: { tenantId: tenant.id } });
    const account = accounts.find(a => a.id === mapping.resource.accountId);
    if (!account) return NextResponse.json({ error: 'No associated ExternalAccount found for this location!' });

    // Get access token
    let accessToken: string;
    if (connection.encryptedRefreshToken && connection.encryptedRefreshToken !== 'service-account-mock-token') {
      try {
        accessToken = await GoogleOAuthService.refreshAccessToken(connection.encryptedRefreshToken, tenant.id, connection.id);
      } catch (err: any) {
        return NextResponse.json({ error: 'GoogleOAuthService failed to refresh token!', message: err.message });
      }
    } else {
      const { getAuthenticatedGoogleClient } = await import('@/shared/lib/google-auth');
      const auth = getAuthenticatedGoogleClient();
      accessToken = await auth.getAccessToken() as string;
    }

    const cleanAccountId = account.externalAccountId.replace('accounts/', '');
    const cleanLocationId = mapping.resource.externalResourceId.replace('locations/', '');
    
    // Hit Google API
    const url = `https://mybusiness.googleapis.com/v4/accounts/${cleanAccountId}/locations/${cleanLocationId}/reviews?pageSize=50`;
    const rawRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    
    let rawGoogleReviews;
    if (rawRes.ok) {
      rawGoogleReviews = await rawRes.json();
    } else {
      rawGoogleReviews = { error: await rawRes.text(), status: rawRes.status };
    }

    return NextResponse.json({
      success: true,
      message: "Here is exactly what Google returned to us for this location:",
      googleApiStatus: rawRes.status,
      googleApiResponse: rawGoogleReviews,
      debugInfo: {
        accountId: cleanAccountId,
        locationId: cleanLocationId,
        accessTokenObtained: !!accessToken
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Error', message: err.message, stack: err.stack });
  }
}
