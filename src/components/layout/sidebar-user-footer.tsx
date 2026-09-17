'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { browserClient } from '@/lib/http/browser-client';
import { SafeUserNavDto } from './sidebar-nav-config';

interface SidebarUserFooterProps {
  user: SafeUserNavDto;
}

export function SidebarUserFooter({ user }: SidebarUserFooterProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await browserClient.post('/auth/logout');
    } finally {
      router.push('/login');
    }
  };

  return (
    <div className="px-3 pb-3 pt-2 border-t border-slate-100 space-y-2">
      <div className="px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-1">
            <div className="text-xs font-semibold text-slate-800 truncate">
              {user.fullName || user.email.split('@')[0]}
            </div>
            <div className="text-[10px] text-slate-400 truncate font-mono">
              {user.email}
            </div>
          </div>
          <Badge
            variant="secondary"
            className="py-0 px-1.5 text-[9px] capitalize font-medium flex-shrink-0"
          >
            {user.role.replace(/_/g, ' ').toLowerCase()}
          </Badge>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        id="workspace-sign-out-btn"
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 cursor-pointer"
      >
        <LogOut className="h-3.5 w-3.5 text-slate-400" />
        <span>Sign Out</span>
      </button>
    </div>
  );
}
