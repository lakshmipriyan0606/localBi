import { google } from 'googleapis';
import path from 'path';

// The scopes determine what APIs this service account is allowed to access
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/business.manage' // For GBP
];

/**
 * Creates an authenticated Google client using the local JSON Service Account file.
 */
export function getAuthenticatedGoogleClient() {
  // We resolve the path to the google-credentials.json file in the root of the project
  const keyfilePath = path.join(process.cwd(), 'google-credentials.json');

  const auth = new google.auth.GoogleAuth({
    keyFile: keyfilePath,
    scopes: SCOPES,
  });

  return auth;
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
