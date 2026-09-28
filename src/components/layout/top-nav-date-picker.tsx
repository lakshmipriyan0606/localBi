'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { NiceSelect } from '@/components/ui/nice-select';

export function TopNavDatePicker() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const daysParam = searchParams.get('days');
  const currentDays = daysParam ? parseInt(daysParam, 10) : 30;

  const handleDateChange = (days: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('days', days);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <NiceSelect
      label=""
      icon={<Calendar className="h-3.5 w-3.5 text-slate-400" />}
      options={[
        { id: '1', name: 'Today' },
        { id: '7', name: 'Last 7 Days' },
        { id: '14', name: 'Last 14 Days' },
        { id: '30', name: 'Last 30 Days' },
        { id: '90', name: 'Last 90 Days' },
        { id: '365', name: 'Overall (All time)' },
      ]}
      value={currentDays.toString()}
      onChange={handleDateChange}
      className="w-[180px]"
    />
  );
}
