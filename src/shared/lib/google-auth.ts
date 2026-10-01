import { google } from 'googleapis';

// The scopes determine what APIs this service account is allowed to access
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/business.manage' // For GBP
];

/**
 * Creates an authenticated Google client using environment credentials or Application Default Credentials.
 */
export function getAuthenticatedGoogleClient() {
  if (process.env['GOOGLE_SERVICE_ACCOUNT_JSON']) {
    try {
      const credentials = JSON.parse(process.env['GOOGLE_SERVICE_ACCOUNT_JSON']);
      return new google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES,
      });
    } catch (err) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON environment variable:', err);
    }
  }

  if (process.env['GOOGLE_APPLICATION_CREDENTIALS']) {
    return new google.auth.GoogleAuth({
      keyFile: process.env['GOOGLE_APPLICATION_CREDENTIALS'],
      scopes: SCOPES,
    });
  }

  // Standard Google Application Default Credentials (ADC) resolution
  return new google.auth.GoogleAuth({
    scopes: SCOPES,
  });
}

/**
 * Helper to get the Search Console API instance (GSC)
 */
export async function getGSCClient() {
  const auth = getAuthenticatedGoogleClient();
  return google.webmasters({ version: 'v3', auth });
}

/**
 * Helper to get the GA4 (Analytics Data API) instance
 */
export async function getGA4Client() {
  const auth = getAuthenticatedGoogleClient();
  return google.analyticsdata({ version: 'v1beta', auth });
}

/**
 * Helper to get the Google My Business API instance (GBP)
 */
export async function getGBPClient() {
  const auth = getAuthenticatedGoogleClient();
  return google.mybusinessbusinessinformation({ version: 'v1', auth });
}
