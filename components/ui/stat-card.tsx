"use client";

import { cn } from "@/lib/utils";
import { GlassCard } from "./glass-card";
import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  accent?: boolean;
  className?: string;
  children?: ReactNode;
}

export function StatCard({
  label,
  value,
  icon,
  accent,
  className,
  children,
}: StatCardProps) {
  return (
    <GlassCard
      className={cn(
        "p-4 flex flex-col gap-1.5",
        accent && "border-primary/30 bg-primary/[0.02]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "text-muted-foreground",
            accent && "text-primary"
          )}
        >
          {icon}
        </span>
      </div>
      <span
        className={cn(
          "text-xl font-bold tracking-tight",
          accent && "gradient-text"
        )}
      >
        {value}
      </span>
      {children}
    </GlassCard>
  );
}
