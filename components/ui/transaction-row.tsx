"use client";

import { cn, formatCurrency, formatDateTime, truncateAddress } from "@/lib/utils";
import { TxType } from "@/lib/constants";
import { StatusBadge } from "./status-badge";
import { ArrowDownLeft, ArrowUpRight, RotateCcw, ExternalLink } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  token: string;
  amount: number;
  status: string;
  txHash?: string | null;
  createdAt: string;
}

interface TransactionRowProps {
  transaction: Transaction;
}

const TYPE_CONFIG = {
  [TxType.DEPOSIT]: {
    icon: ArrowDownLeft,
    label: "Deposit",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  [TxType.WITHDRAWAL]: {
    icon: ArrowUpRight,
    label: "Withdrawal",
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  [TxType.ACCRUAL]: {
    icon: RotateCcw,
    label: "Profit Accrual",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] ?? {
    icon: ExternalLink,
    label: type,
    color: "text-muted-foreground",
    bg: "bg-white/5",
  };
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const config = getTypeConfig(transaction.type);
  const Icon = config.icon;
  const isCredit =
    transaction.type === TxType.DEPOSIT ||
    transaction.type === TxType.ACCRUAL;

  return (
    <div className="flex items-center gap-3 py-3 px-1">
      {/* Icon */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          config.bg
        )}
      >
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {config.label}
          </span>
          <StatusBadge status={transaction.status} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{transaction.token}</span>
          {transaction.txHash && (
            <>
              <span className="text-muted-foreground/40">&middot;</span>
              <span>{truncateAddress(transaction.txHash)}</span>
            </>
          )}
          <span className="text-muted-foreground/40">&middot;</span>
          <span>{formatDateTime(transaction.createdAt)}</span>
        </div>
      </div>

      {/* Amount */}
      <span
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          isCredit ? "text-green-400" : "text-red-400"
        )}
      >
        {isCredit ? "+" : "-"}
        {formatCurrency(transaction.amount)}
      </span>
    </div>
  );
}
