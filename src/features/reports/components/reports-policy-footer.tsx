export function ReportsPolicyFooter({ activeSource }: { activeSource: 'gbp' | 'gsc' }) {
  return (
    <footer className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-500 leading-relaxed">
      {activeSource === 'gbp' ? (
        <p>
          <strong className="text-slate-700">Google Business Profile policy notice:</strong>{' '}
          GBP metrics are stored in compliance with official GBP developer data retention policies (30-day bounded window).
          Direction requests and call-button clicks reflect customer intent actions — they do not represent confirmed
          phone calls or completed navigations. Website link clicks from GBP are not equivalent to confirmed web analytics sessions.
        </p>
      ) : (
        <p>
          <strong className="text-slate-700">Google Search Console policy notice:</strong>{' '}
          Search Console average position is impression-weighted and may differ from rank-tracking tools.
          Clicks and impressions are sourced directly from the Google Search Console API. Search Console retains
          historical query telemetry for up to 16 months.
        </p>
      )}
    </footer>
  );
}
