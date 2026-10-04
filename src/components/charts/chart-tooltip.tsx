'use client';

import * as React from 'react';
import { ChartTooltipFrame, type ChartTooltipItem } from './chart-tooltip-frame';
import { AnalyticsFormatters } from '@/shared/analytics/formatters';

export interface StandardChartTooltipProps {
  active?: boolean | undefined;
  payload?: Array<{
    name?: string | undefined;
    value?: number | string | undefined;
    color?: string | undefined;
    dataKey?: string | undefined;
  }> | undefined;
  label?: string | number | undefined;
  labelFormatter?: ((label: string | number) => string) | undefined;
  valueFormatter?: ((value: number | string, name?: string) => string) | undefined;
  titlePrefix?: string | undefined;
  timezone?: string | undefined;
}

export function StandardChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  titlePrefix,
  timezone,
}: StandardChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  let formattedTitle = label !== undefined ? String(label) : '';
  if (labelFormatter && label !== undefined) {
    formattedTitle = labelFormatter(label);
  } else if (label !== undefined && typeof label === 'string' && /^\d{4}-\d{2}-\d{2}/.test(label)) {
    formattedTitle = AnalyticsFormatters.date(label, 'short', timezone);
  }

  if (titlePrefix && formattedTitle) {
    formattedTitle = `${titlePrefix}: ${formattedTitle}`;
  }

  const items: ChartTooltipItem[] = payload.map((entry) => {
    let formattedVal = entry.value !== undefined ? String(entry.value) : '0';
    if (valueFormatter && entry.value !== undefined) {
      formattedVal = valueFormatter(entry.value, entry.name);
    } else if (typeof entry.value === 'number') {
      formattedVal = AnalyticsFormatters.number(entry.value);
    }

    return {
      label: entry.name || entry.dataKey || 'Value',
      value: formattedVal,
      color: entry.color,
    };
  });

  return <ChartTooltipFrame title={formattedTitle} items={items} />;
}

export { ChartTooltipFrame, type ChartTooltipItem };
