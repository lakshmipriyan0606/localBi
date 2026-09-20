import http from 'http';

const req = http.request(
  'http://localhost:3000/api/tenants/lakshmi-food/reports/summary?brandId=cmu9eqki30001ubj4kulafgt4&startDate=2026-08-21&endDate=2026-09-20',
  {
    headers: {
      'Cookie': 'next-auth.session-token=mock'
    }
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log('Response:', data));
  }
);
req.on('error', console.error);
req.end();
