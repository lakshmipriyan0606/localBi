/** Structured mock data matching screenshot values for the overview dashboard */

export const GBP_METRICS = [
  { key: 'gsc-clicks', label: 'GSC CLICKS', value: 826, delta: 14.5, icon: 'mouse-pointer-click', color: 'indigo' },
  { key: 'gsc-impressions', label: 'GSC IMPRESSIONS', value: 16304, delta: 18.2, icon: 'eye', color: 'indigo' },
  { key: 'gbp-views', label: 'GBP VIEWS', value: 25814, delta: 24.1, icon: 'globe', color: 'teal' },
  { key: 'gbp-calls', label: 'GBP CALLS', value: 958, delta: 12.3, icon: 'phone', color: 'blue' },
  { key: 'gbp-directions', label: 'GBP DIRECTION REQUESTS', value: 1855, delta: 28.6, icon: 'navigation', color: 'emerald' },
  { key: 'website-conversions', label: 'WEBSITE CONVERSIONS', value: 312, delta: 36.8, icon: 'target', color: 'violet' },
] as const;

export const GBP_SECTION_METRICS = [
  { key: 'profile-views', label: 'Profile Views', value: 25814, delta: 24.1, icon: 'eye', color: 'teal' },
  { key: 'calls', label: 'Calls', value: 958, delta: 12.3, icon: 'phone', color: 'blue' },
  { key: 'directions', label: 'Direction Requests', value: 1855, delta: 28.6, icon: 'navigation', color: 'emerald' },
  { key: 'reviews', label: 'Reviews', value: 312, delta: 36.8, icon: 'star', color: 'amber' },
  { key: 'photo-views', label: 'Photo Views', value: 7421, delta: 18.9, icon: 'image', color: 'purple' },
] as const;

export const GSC_METRICS = [
  { key: 'clicks', label: 'Clicks', value: 16304, delta: 18.2, icon: 'mouse-pointer-click', color: 'indigo' },
  { key: 'impressions', label: 'Impressions', value: 412903, delta: 27.6, icon: 'eye', color: 'blue' },
  { key: 'ctr', label: 'CTR', value: 3.9, delta: 12.1, suffix: '%', icon: 'percent', color: 'violet' },
  { key: 'position', label: 'Average Position', value: 12.4, delta: -3.8, icon: 'trending-up', color: 'emerald', invertDelta: true },
] as const;

export const WEB_ANALYTICS_METRICS = [
  { key: 'users', label: 'Users', value: 12842, delta: 22.6, icon: 'users', color: 'sky' },
  { key: 'sessions', label: 'Sessions', value: 18421, delta: 18.9, icon: 'activity', color: 'blue' },
  { key: 'engaged', label: 'Engaged Sessions', value: 9538, delta: 27.3, icon: 'clock', color: 'indigo' },
  { key: 'conv-rate', label: 'Conversion Rate', value: 4.8, delta: 34.1, suffix: '%', icon: 'target', color: 'emerald' },
  { key: 'conversions', label: 'Website Conversions', value: 885, delta: 28.6, icon: 'check-circle', color: 'teal' },
] as const;

export const PERFORMANCE_TIMESERIES = (() => {
  const data: Array<{ date: string; clicks: number; impressions: number; gbpViews: number; gbpActions: number }> = [];
  const base = new Date(2026, 7, 18);
  for (let i = 0; i < 31; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const factor = 0.85 + Math.random() * 0.3;
    data.push({
      date: dateStr,
      clicks: Math.round(500 + Math.sin(i * 0.3) * 150 + i * 8 * factor),
      impressions: Math.round(12000 + Math.sin(i * 0.2) * 4000 + i * 200 * factor),
      gbpViews: Math.round(700 + Math.cos(i * 0.25) * 200 + i * 5 * factor),
      gbpActions: Math.round(300 + Math.sin(i * 0.35) * 100 + i * 4 * factor),
    });
  }
  return data;
})();

export const CHANNEL_ACQUISITION = [
  { channel: 'Google Search', pct: 42.8, count: 11057, color: '#4338CA' },
  { channel: 'Google Maps', pct: 28.6, count: 7384, color: '#0F766E' },
  { channel: 'Direct', pct: 12.4, count: 3204, color: '#7C3AED' },
  { channel: 'Referral', pct: 8.1, count: 2091, color: '#0369A1' },
  { channel: 'Social', pct: 5.4, count: 1355, color: '#B45309' },
  { channel: 'Other', pct: 2.7, count: 683, color: '#94A3B8' },
] as const;

export const TOP_SEARCH_QUERIES = [
  { query: 'dentist near me', clicks: 312, impressions: 4855, ctr: '6.4%', delta: 12 },
  { query: 'abc dental', clicks: 198, impressions: 3912, ctr: '5.1%', delta: -28 },
  { query: 'emergency dentist denver', clicks: 142, impressions: 2941, ctr: '4.8%', delta: 34 },
  { query: 'teeth cleaning denver', clicks: 96, impressions: 1887, ctr: '5.1%', delta: 19 },
  { query: 'dental implants denver', clicks: 73, impressions: 1421, ctr: '5.1%', delta: 27 },
] as const;

export const GSC_TOP_QUERIES = [
  { query: 'abc dental', clicks: 2841, impressions: 28421, ctr: '10.0%', position: '1.2' },
  { query: 'dentist near me', clicks: 2312, impressions: 54118, ctr: '4.3%', position: '2.1' },
  { query: 'emergency dentist denver', clicks: 1426, impressions: 32672, ctr: '4.4%', position: '3.8' },
  { query: 'teeth whitening denver', clicks: 892, impressions: 21331, ctr: '4.2%', position: '4.1' },
  { query: 'dental implants denver', clicks: 742, impressions: 18421, ctr: '4.0%', position: '5.6' },
] as const;

export const KEYWORD_OPPORTUNITIES = [
  { keyword: 'cosmetic dentist denver', potential: 'High' as const },
  { keyword: 'invisalign denver', potential: 'High' as const },
  { keyword: 'family dentist denver', potential: 'Medium' as const },
  { keyword: 'same day crown denver', potential: 'Medium' as const },
  { keyword: 'pediatric dentist denver', potential: 'Low' as const },
] as const;

export const LOCATION_RANKINGS = [
  { rank: 1, name: 'Denver (HQ)', users: 5421, conversions: 842, rate: '4.9%', trend: 28 },
  { rank: 2, name: 'Lakewood', users: 3218, conversions: 421, rate: '4.2%', trend: 24 },
  { rank: 3, name: 'Aurora', users: 2184, conversions: 298, rate: '4.6%', trend: 18 },
  { rank: 4, name: 'Westminster', users: 1421, conversions: 156, rate: '3.8%', trend: 12 },
  { rank: 5, name: 'Littleton', users: 598, conversions: 74, rate: '3.1%', trend: 8 },
] as const;

export const LOCATION_PERFORMANCE_TABLE = [
  { name: 'Denver (HQ)', views: 8421, clicks: 312, calls: 185, direction: 482, trend: 28 },
  { name: 'Lakewood', views: 6892, clicks: 248, calls: 142, direction: 376, trend: 24 },
  { name: 'Aurora', views: 5312, clicks: 158, calls: 98, direction: 284, trend: 18 },
  { name: 'Westminster', views: 3981, clicks: 92, calls: 68, direction: 201, trend: 12 },
  { name: 'Littleton', views: 3208, clicks: 76, calls: 54, direction: 167, trend: 8 },
] as const;

export const GSC_TREND_DATA = (() => {
  const data: Array<{ date: string; clicks: number; impressions: number }> = [];
  const base = new Date(2026, 7, 18);
  for (let i = 0; i < 31; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const factor = 0.85 + Math.random() * 0.3;
    data.push({
      date: dateStr,
      clicks: Math.round(400 + Math.sin(i * 0.25) * 180 + i * 10 * factor),
      impressions: Math.round(10000 + Math.sin(i * 0.2) * 5000 + i * 280 * factor),
    });
  }
  return data;
})();
