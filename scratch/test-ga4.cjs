const { google } = require('googleapis');
const path = require('path');

async function test() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '../google-credentials.json'),
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });

  const ga4Client = google.analyticsdata({ version: 'v1beta', auth });
  
  try {
    const res = await ga4Client.properties.runReport({
      property: 'properties/9999999999',
      requestBody: {
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }],
        limit: '1',
      },
    });
    console.log('SUCCESS:', res.status);
  } catch (err) {
    console.log('ERROR:', err.message);
  }
}

test();
