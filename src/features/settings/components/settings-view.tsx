'use client';

import { OrganizationSettingsForm } from './organization-settings-form';
import { ActiveSessionsCard } from './active-sessions-card';
import { TenantSettingsDto } from '../types/settings-dto';

interface SettingsViewProps {
  tenant: TenantSettingsDto;
}

export function SettingsView({ tenant }: SettingsViewProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Settings & Sessions
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure organization preferences and manage authorized active device sessions.
        </p>
      </div>

      <OrganizationSettingsForm tenant={tenant} />
      <ActiveSessionsCard />
    </div>
  );
}
