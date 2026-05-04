"use client";

import { useState, useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { GlassCard } from "./glass-card";
import { WITHDRAWAL_DAYS } from "@/lib/constants";
import {
  Loader2,
  Wallet,
  ArrowUpCircle,
  Calendar,
  Lock,
  DollarSign,
} from "lucide-react";

interface WithdrawModalProps {
  availableProfit: number;
  isWithdrawalDay: boolean;
}

function getNextWithdrawalDate(from: Date): Date {
  const utcDay = from.getUTCDate();
  const utcHour = from.getUTCHours();
  const currentMonth = from.getUTCMonth();
  const currentYear = from.getUTCFullYear();

  // Find the next withdrawal day (today if it's still open before end of day UTC)
  for (const day of WITHDRAWAL_DAYS) {
    if (day > utcDay || (day === utcDay && utcHour < 24)) {
      return new Date(Date.UTC(currentYear, currentMonth, day, 0, 0, 0));
    }
  }
  // Roll to next month
  return new Date(Date.UTC(currentYear, currentMonth + 1, WITHDRAWAL_DAYS[0], 0, 0, 0));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function WithdrawModal({
  availableProfit,
  isWithdrawalDay,
}: WithdrawModalProps) {
  const { authenticated, login } = usePrivy();
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedAmount = amount ? parseFloat(amount) : 0;
  const isValidAmount =
    parsedAmount > 0 &&
    parsedAmount <= availableProfit &&
    isWithdrawalDay &&
    !isNaN(parsedAmount);

  const nextWithdrawalDate = useMemo(
    () => getNextWithdrawalDate(new Date()),
    []
  );

  const handleMax = useCallback(() => {
    if (availableProfit > 0) {
      setAmount(availableProfit.toFixed(2));
    }
  }, [availableProfit]);

  const handleWithdraw = useCallback(async () => {
    if (!isValidAmount) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          token: "USDC",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Withdrawal request failed");
      }

      toast.success(
        `Withdrawal of ${parsedAmount.toFixed(2)} USDC requested successfully!`
      );
      setAmount("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Withdrawal failed";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [isValidAmount, parsedAmount]);

  if (!authenticated) {
    return (
      <GlassCard className="flex flex-col items-center gap-4 py-12">
        <Wallet className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          Connect your wallet to withdraw profits
        </p>
        <button onClick={login} className="btn-primary">
          Connect Wallet
        </button>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Withdraw</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Withdrawals available on the 1st, 11th, and 21st of each month (UTC)
        </p>
      </div>

      {/* Available Profit */}
      <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">
            Available to withdraw
          </span>
        </div>
        <span className="text-lg font-bold tabular-nums text-primary">
          ${availableProfit.toFixed(2)}
        </span>
      </div>

      {/* Withdrawal Day Status */}
      {!isWithdrawalDay && (
        <div className="rounded-xl bg-warning/10 border border-warning/20 px-4 py-3 flex items-start gap-2">
          <Calendar className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">
              Not a withdrawal day
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Next withdrawal window opens{" "}
              <span className="font-medium text-foreground">
                {formatDate(nextWithdrawalDate)}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Amount Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            Withdrawal Amount
          </label>
          <button
            onClick={handleMax}
            disabled={!isWithdrawalDay || availableProfit <= 0}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Max: ${availableProfit.toFixed(2)}
          </button>
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
            $
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            max={availableProfit}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!isWithdrawalDay || isSubmitting}
            className={cn(
              "w-full rounded-xl border border-card-border bg-background px-8 py-3 text-lg font-semibold",
              "placeholder:text-muted-foreground/30",
              "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "tabular-nums"
            )}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
            USDC
          </span>
        </div>
        {amount && parsedAmount > availableProfit && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Amount exceeds available profit
          </p>
        )}
        {amount && parsedAmount > 0 && parsedAmount <= availableProfit && (
          <p className="text-xs text-muted-foreground">
            You will receive ${parsedAmount.toFixed(2)} USDC
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleWithdraw}
        disabled={!isValidAmount || isSubmitting}
        className={cn(
          "btn-primary w-full flex items-center justify-center gap-2",
          (isSubmitting || !isValidAmount) && "opacity-70 cursor-not-allowed"
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing Withdrawal...
          </>
        ) : (
          <>
            <ArrowUpCircle className="h-4 w-4" />
            Withdraw ${parsedAmount > 0 ? parsedAmount.toFixed(2) : "0"} USDC
          </>
        )}
      </button>

      {/* Guidelines */}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 shrink-0" />
          Withdrawals processed on withdrawal days
        </p>
        <p className="flex items-center gap-1.5">
          <Lock className="h-3 w-3 shrink-0" />
          Only accrued profit is withdrawable (not principal)
        </p>
      </div>
    </GlassCard>
  );
}
