'use client';

import { OrganizationSettingsForm } from './organization-settings-form';
import { ActiveSessionsCard } from './active-sessions-card';
import { TenantSettingsDto } from '../types/settings-dto';
import { PageHeader } from '@/components/layout/page-header';

interface SettingsViewProps {
  tenant: TenantSettingsDto;
}

export function SettingsView({ tenant }: SettingsViewProps) {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings & Sessions"
        description="Configure organization preferences and manage authorized active device sessions."
      />

      <OrganizationSettingsForm tenant={tenant} />
      <ActiveSessionsCard />
    </div>
  );
}
