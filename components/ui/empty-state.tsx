"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { GlassCard } from "./glass-card";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <GlassCard
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-12 px-6 text-center",
        className
      )}
      hover={false}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {description}
        </p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </GlassCard>
  );
}
