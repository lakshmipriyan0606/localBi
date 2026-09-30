
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/cn";

export type IntegrationStatus = "VERIFIED" | "PENDING" | "UNVERIFIED" | "ERROR";

interface IntegrationStatusBadgeProps {
  status: IntegrationStatus;
  className?: string;
  label?: string;
}

export function IntegrationStatusBadge({
  status,
  className,
  label,
}: IntegrationStatusBadgeProps) {
  const configs = {
    VERIFIED: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
      Icon: CheckCircle2,
      defaultLabel: "Verified",
    },
    PENDING: {
      bg: "bg-amber-50 border-amber-200 text-amber-700",
      Icon: Clock,
      defaultLabel: "Pending",
    },
    UNVERIFIED: {
      bg: "bg-amber-50 border-amber-200 text-amber-700",
      Icon: AlertTriangle,
      defaultLabel: "Unverified",
    },
    ERROR: {
      bg: "bg-red-50 border-red-200 text-red-700",
      Icon: AlertTriangle,
      defaultLabel: "Error",
    },
  };

  const config = configs[status];
  const Icon = config.Icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold tracking-tight uppercase shadow-2xs",
        config.bg,
        className
      )}
    >
      <Icon className="w-3 h-3 stroke-[2.5]" />
      {label || config.defaultLabel}
    </span>
  );
}
