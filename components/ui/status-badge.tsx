"use client";

import { cn } from "@/lib/utils";
import { TxStatus } from "@/lib/constants";

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  [TxStatus.PENDING]: {
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  },
  [TxStatus.PROCESSING]: {
    label: "Processing",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  [TxStatus.CONFIRMED]: {
    label: "Confirmed",
    className: "bg-green-500/10 text-green-400 border-green-500/20",
  },
  [TxStatus.COMPLETED]: {
    label: "Completed",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  [TxStatus.FAILED]: {
    label: "Failed",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className:
      "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
