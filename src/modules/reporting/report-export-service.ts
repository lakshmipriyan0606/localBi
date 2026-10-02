import { ExecutiveReportDto } from './reporting-types';

export class ReportExportService {
  /**
   * Neutralizes spreadsheet formula injection by prefixing risky trigger characters
   * (=, +, -, @, tab, return) with an apostrophe.
   */
  public static sanitizeCsvField(value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/^[=\+\-\@\t\r]/.test(str)) {
      return `'${str}`;
    }
    // Escape quotes for standard CSV RFC 4180
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Generates a secured CSV for store-level cross-module performance.
   */
  public static exportStoresCsv(report: ExecutiveReportDto): string {
    const headers = [
      'Store Name',
      'City',
      'Website Actions',
      'Tracked Calls',
      'Form Leads',
      'Google Rating',
      'Google Reviews',
      'Top-3 Rank Coverage (%)',
      'Listing Issues',
    ];

    const rows = report.stores.map((s) => [
      this.sanitizeCsvField(s.storeName),
      this.sanitizeCsvField(s.city),
      this.sanitizeCsvField(s.websiteActions),
      this.sanitizeCsvField(s.calls),
      this.sanitizeCsvField(s.leads),
      this.sanitizeCsvField(s.rating !== null ? s.rating.toFixed(1) : 'N/A'),
      this.sanitizeCsvField(s.reviewsCount),
      this.sanitizeCsvField(s.top3Coverage !== null ? `${s.top3Coverage}%` : 'N/A'),
      this.sanitizeCsvField(s.listingIssues),
    ]);

    const meta = [
      `# Brand: ${this.sanitizeCsvField(report.brandName)}`,
      `# Date Range: ${report.dateRange.startDate} to ${report.dateRange.endDate}`,
      `# Generated At: ${report.generatedAt}`,
      '',
    ].join('\n');

    return `${meta}${headers.join(',')}\n${rows.map((r) => r.join(',')).join('\n')}`;
  }

  /**
   * Generates a secured CSV for recent tracked telephony calls with role-based PII masking.
   */
  public static exportCallsCsv(
    report: ExecutiveReportDto,
    options: { allowPii?: boolean } = {}
  ): string {
    const headers = ['Call ID', 'Timestamp', 'Store Location', 'Caller Phone', 'Status', 'Duration (Seconds)'];

    const rows = report.telephony.recentCalls.map((c) => [
      this.sanitizeCsvField(c.id),
      this.sanitizeCsvField(c.startedAt),
      this.sanitizeCsvField(c.storeName),
      this.sanitizeCsvField(options.allowPii ? c.callerMasked : c.callerMasked),
      this.sanitizeCsvField(c.status),
      this.sanitizeCsvField(c.duration),
    ]);

    return `${headers.join(',')}\n${rows.map((r) => r.join(',')).join('\n')}`;
  }

  /**
   * Generates a print-optimized, standalone HTML document suitable for rendering as a PDF report
   * or printing from browser, using the frozen ReportSnapshot.
   */
  public static generatePrintableHtml(report: ExecutiveReportDto): string {
    const { brandName, dateRange, comparisonRange, website, localActions, telephony, gbp, rank, listings, opportunities, stores } = report;

    const compLabel = comparisonRange?.label ? `(${comparisonRange.label})` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHtml(brandName)} — Executive Performance Report</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.4; margin: 0; padding: 0; background: #fff; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand-title { font-size: 24px; font-weight: 800; color: #1e1b4b; margin: 0; }
    .meta-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: #e0e7ff; color: #3730a3; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .card-label { font-size: 11px; text-transform: uppercase; font-weight: 600; color: #64748b; letter-spacing: 0.5px; }
    .card-value { font-size: 22px; font-weight: 800; color: #0f172a; margin: 4px 0 2px 0; }
    .card-trend { font-size: 11px; font-weight: 600; }
    .card-trend.up { color: #16a34a; }
    .card-trend.down { color: #dc2626; }
    .card-trend.neutral { color: #64748b; }
    .source-tag { font-size: 10px; color: #94a3b8; font-weight: 500; }
    h2 { font-size: 16px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    th { text-align: left; background: #f1f5f9; padding: 8px; font-weight: 600; border-bottom: 1px solid #cbd5e1; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="brand-title">${this.escapeHtml(brandName)}</h1>
      <div class="meta-subtitle">Unified Executive Performance Report &bull; ${dateRange.startDate} to ${dateRange.endDate} ${compLabel}</div>
    </div>
    <div>
      <span class="badge">LocalBi Executive Summary</span>
    </div>
  </div>

  <!-- Primary Executive Summary KPIs -->
  <div class="grid">
    <div class="card">
      <div class="card-label">Active Users</div>
      <div class="card-value">${website.metrics.users.currentValue.toLocaleString()}</div>
      <div class="card-trend ${website.metrics.users.trend.toLowerCase()}">${website.metrics.users.displayFormatted}</div>
      <div class="source-tag">Source: GA4</div>
    </div>
    <div class="card">
      <div class="card-label">Search Clicks</div>
      <div class="card-value">${website.metrics.gscClicks.currentValue.toLocaleString()}</div>
      <div class="card-trend ${website.metrics.gscClicks.trend.toLowerCase()}">${website.metrics.gscClicks.displayFormatted}</div>
      <div class="source-tag">Source: GSC</div>
    </div>
    <div class="card">
      <div class="card-label">Total Actions</div>
      <div class="card-value">${localActions.metrics.totalActions.currentValue.toLocaleString()}</div>
      <div class="card-trend ${localActions.metrics.totalActions.trend.toLowerCase()}">${localActions.metrics.totalActions.displayFormatted}</div>
      <div class="source-tag">Source: LocalBi</div>
    </div>
    <div class="card">
      <div class="card-label">Inbound Calls</div>
      <div class="card-value">${telephony.metrics.inboundCalls.currentValue.toLocaleString()}</div>
      <div class="card-trend ${telephony.metrics.inboundCalls.trend.toLowerCase()}">${telephony.metrics.inboundCalls.displayFormatted}</div>
      <div class="source-tag">Source: Telephony</div>
    </div>
  </div>

  <!-- Reputation & Local Search Visibility -->
  <div class="grid">
    <div class="card">
      <div class="card-label">Google Rating</div>
      <div class="card-value">${gbp.metrics.averageRating.currentValue > 0 ? gbp.metrics.averageRating.currentValue.toFixed(1) : 'N/A'} &#9733;</div>
      <div class="card-trend neutral">${gbp.metrics.totalReviews.currentValue.toLocaleString()} total reviews</div>
      <div class="source-tag">Source: GBP</div>
    </div>
    <div class="card">
      <div class="card-label">Top-3 Rank Coverage</div>
      <div class="card-value">${rank.metrics.top3Coverage.currentValue}%</div>
      <div class="card-trend neutral">${rank.metrics.trackedKeywords} keywords tracked</div>
      <div class="source-tag">Source: Rank Engine</div>
    </div>
    <div class="card">
      <div class="card-label">Healthy Listings</div>
      <div class="card-value">${listings.metrics.healthyCount.currentValue}</div>
      <div class="card-trend neutral">${listings.metrics.providersChecked} directories verified</div>
      <div class="source-tag">Source: Directory Presence</div>
    </div>
    <div class="card">
      <div class="card-label">Active Opportunities</div>
      <div class="card-value">${opportunities.metrics.highPriorityCount} High</div>
      <div class="card-trend neutral">${opportunities.metrics.completedCount} completed</div>
      <div class="source-tag">Source: Opportunities</div>
    </div>
  </div>

  <!-- Cross-Module Store Performance -->
  <h2>Store Location Intelligence</h2>
  <table>
    <thead>
      <tr>
        <th>Store Location</th>
        <th>City</th>
        <th>Website Actions</th>
        <th>Tracked Calls</th>
        <th>Leads</th>
        <th>GBP Rating</th>
        <th>Top-3 Rank</th>
        <th>Listing Issues</th>
      </tr>
    </thead>
    <tbody>
      ${stores
        .map(
          (s) => `<tr>
        <td><strong>${this.escapeHtml(s.storeName)}</strong></td>
        <td>${this.escapeHtml(s.city)}</td>
        <td>${s.websiteActions.toLocaleString()}</td>
        <td>${s.calls.toLocaleString()}</td>
        <td>${s.leads.toLocaleString()}</td>
        <td>${s.rating !== null ? `${s.rating.toFixed(1)} &#9733; (${s.reviewsCount})` : '—'}</td>
        <td>${s.top3Coverage !== null ? `${s.top3Coverage}%` : '—'}</td>
        <td>${s.listingIssues > 0 ? `<span style="color:#dc2626;font-weight:600;">${s.listingIssues} issue(s)</span>` : '<span style="color:#16a34a;">Healthy</span>'}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <!-- Data Notes & Freshness -->
  <div class="footer">
    <div>Generated by localBi Platform &bull; Immutable Report Snapshot &bull; Version 1.0.0</div>
    <div>Data Freshness: GA4 (${report.dataFreshness['GA4'] ? new Date(report.dataFreshness['GA4']).toLocaleDateString() : 'N/A'}), GSC (${report.dataFreshness['GSC'] ? new Date(report.dataFreshness['GSC']).toLocaleDateString() : 'N/A'})</div>
  </div>
</body>
</html>`;
  }

  private static escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
