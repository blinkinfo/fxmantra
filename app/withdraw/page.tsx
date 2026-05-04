"use client";

import { useState, useCallback, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Clock,
  CalendarDays,
  Info,
  Wallet,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  Ban,
} from "lucide-react";
import {
  isWithdrawalDay,
  getNextWithdrawalDate,
  formatDate,
  formatCurrency,
  calculateAvailableProfit,
  cn,
} from "@/lib/utils";
import { WITHDRAWAL_DAYS, TxStatus, TxType } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BalanceData {
  totalDeposited: string;
  totalWithdrawn: string;
  accruedProfit: string;
  withdrawnProfit: string;
}

interface TransactionData {
  id: string;
  type: string;
  token: string;
  amount: string;
  txHash: string | null;
  status: string;
  createdAt: string;
}

interface WithdrawResponse {
  success: boolean;
  transaction?: TransactionData;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  COMPLETED:
    "bg-green-500/10 text-green-400 border-green-500/20",
  PROCESSING:
    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  CONFIRMED:
    "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        STATUS_STYLES[status] || "bg-gray-500/10 text-gray-400 border-gray-500/20"
      )}
    >
      {status === "COMPLETED" && <CheckCircle2 className="h-3 w-3" />}
      {status === "FAILED" && <AlertCircle className="h-3 w-3" />}
      {status === "PROCESSING" && <Clock className="h-3 w-3" />}
      {status === "PENDING" && <Clock className="h-3 w-3" />}
      {status}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-24 w-full" />
      <div className="skeleton h-14 w-full" />
      <div className="skeleton h-14 w-40" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function WithdrawPage() {
  const { user, authenticated, ready, login } = usePrivy();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTx, setSuccessTx] = useState<TransactionData | null>(null);

  /* ---- Auth gate ---- */
  useEffect(() => {
    if (ready && !authenticated) {
      login();
    }
  }, [ready, authenticated, login]);

  /* ---- Balance fetch ---- */
  const {
    data: balanceData,
    isLoading: balanceLoading,
    error: balanceError,
  } = useQuery<BalanceData>({
    queryKey: ["balance"],
    queryFn: async () => {
      const res = await fetch("/api/balance");
      if (!res.ok) throw new Error("Failed to fetch balance");
      return res.json();
    },
    enabled: ready && authenticated,
    refetchInterval: 30_000,
  });

  /* ---- Recent withdrawals fetch ---- */
  const { data: withdrawals } = useQuery<TransactionData[]>({
    queryKey: ["transactions", "WITHDRAWAL"],
    queryFn: async () => {
      const res = await fetch("/api/transactions?type=WITHDRAWAL&limit=10");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: ready && authenticated,
  });

  /* ---- Derived ---- */
  const todayIsWithdrawalDay = isWithdrawalDay();
  const nextDate = getNextWithdrawalDate();

  const accrued = balanceData ? Number(balanceData.accruedProfit) : 0;
  const withdrawnP = balanceData ? Number(balanceData.withdrawnProfit) : 0;
  const availableProfit = calculateAvailableProfit(accrued, withdrawnP);
  const amountNum = Number.parseFloat(amount) || 0;
  const amountError =
    amountNum > 0 && amountNum > availableProfit
      ? "Amount exceeds available profit"
      : null;

  /* ---- Withdraw mutation ---- */
  const withdrawMutation = useMutation({
    mutationFn: async (withdrawAmount: number): Promise<WithdrawResponse> => {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: withdrawAmount, token: "USDC" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdrawal failed");
      return data;
    },
    onSuccess: (data) => {
      toast.success("Withdrawal submitted successfully!");
      setShowSuccess(true);
      setSuccessTx(data.transaction || null);
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleWithdraw = useCallback(() => {
    if (amountNum <= 0 || amountNum > availableProfit) return;
    withdrawMutation.mutate(amountNum);
  }, [amountNum, availableProfit, withdrawMutation]);

  const handleMax = useCallback(() => {
    setAmount(availableProfit.toFixed(2));
  }, [availableProfit]);

  /* ---- Loading / not ready ---- */
  if (!ready || !authenticated) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4">
        <LoadingSkeleton />
      </main>
    );
  }

  /* ---- Main content ---- */
  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pb-24 pt-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10">
          <Wallet className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Withdraw</h1>
          <p className="text-sm text-muted-foreground">
            Withdraw your profit earnings
          </p>
        </div>
      </div>

      {/* Balance loading */}
      {balanceLoading && <LoadingSkeleton />}

      {/* Balance error */}
      {balanceError && !balanceLoading && (
        <div className="glass flex items-center gap-3 p-4 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Could not load your balance. Please refresh the page.</span>
        </div>
      )}

      {/* Main content */}
      {!balanceLoading && !balanceError && balanceData && (
        <>
          {/* ---- STATE A: Withdrawal day ---- */}
          {todayIsWithdrawalDay ? (
            <>
              {/* Green window-open card */}
              <div className="mb-4 overflow-hidden rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-transparent">
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-400">
                      Withdrawal Window Open
                    </p>
                    <p className="text-xs text-green-400/70">
                      Withdrawals are open today (UTC)
                    </p>
                  </div>
                </div>
              </div>

              {showSuccess && successTx ? (
                /* ---- Success state ---- */
                <div className="glass mb-4 text-center">
                  <div className="px-5 py-8">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
                      <CheckCircle2 className="h-7 w-7 text-green-400" />
                    </div>
                    <h2 className="mb-1 text-lg font-bold">
                      Withdrawal Requested
                    </h2>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Your withdrawal will be processed shortly.
                    </p>
                    <div className="mx-auto mb-4 inline-block rounded-lg bg-green-500/10 px-4 py-2">
                      <p className="text-2xl font-bold text-green-400">
                        {formatCurrency(Number(successTx.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">USDC</p>
                    </div>
                    <p className="mb-4 text-xs text-muted-foreground">
                      Transaction ID: {successTx.id.slice(0, 12)}...
                    </p>
                    <button
                      onClick={() => {
                        setShowSuccess(false);
                        setSuccessTx(null);
                      }}
                      className="btn-outline text-sm"
                    >
                      Make Another Withdrawal
                    </button>
                  </div>
                </div>
              ) : (
                /* ---- Withdraw form ---- */
                <div className="glass mb-4">
                  <div className="px-5 py-5">
                    {/* Available profit */}
                    <div className="mb-5 text-center">
                      <p className="mb-1 text-sm text-muted-foreground">
                        Available to Withdraw
                      </p>
                      <p className="text-3xl font-bold">
                        {formatCurrency(availableProfit)}
                      </p>
                      <p className="text-xs text-muted-foreground">USDC</p>
                    </div>

                    {/* Amount input */}
                    <div className="glass mb-4 border border-white/5 p-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (
                              val === "" ||
                              /^\d*\.?\d{0,6}$/.test(val)
                            ) {
                              setAmount(val);
                            }
                          }}
                          className="flex-1 bg-transparent py-3 pl-3 text-xl font-semibold outline-none placeholder:text-white/20"
                          step="0.01"
                          min="0"
                        />
                        {availableProfit > 0 && (
                          <button
                            onClick={handleMax}
                            className="mr-2 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-400 transition hover:bg-indigo-500/25"
                          >
                            MAX
                          </button>
                        )}
                        <div className="flex items-center gap-1.5 border-l border-white/10 px-3 py-2">
                          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-green-400 to-emerald-600" />
                          <span className="text-sm font-semibold">USDC</span>
                        </div>
                      </div>
                    </div>

                    {/* Amount error */}
                    {amountError && (
                      <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                        <span className="text-xs text-red-400">
                          {amountError}
                        </span>
                      </div>
                    )}

                    {/* Withdraw button */}
                    <button
                      onClick={handleWithdraw}
                      disabled={
                        amountNum <= 0 ||
                        amountNum > availableProfit ||
                        withdrawMutation.isPending
                      }
                      className="btn-primary w-full"
                    >
                      {withdrawMutation.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg
                            className="h-4 w-4 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Withdraw USDC
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ---- STATE B: Not a withdrawal day ---- */
            <>
              {/* Info card */}
              <div className="glass mb-4 border border-indigo-500/10">
                <div className="px-5 py-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/15">
                      <CalendarDays className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-semibold">Withdrawal Window Closed</p>
                      <p className="text-xs text-muted-foreground">
                        Next window opens{" "}
                        <span className="font-medium text-indigo-400">
                          {formatDistanceToNow(nextDate, { addSuffix: true })}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Countdown */}
                  <div className="mb-4 rounded-xl bg-indigo-500/5 px-4 py-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Next Withdrawal Date
                    </p>
                    <p className="text-lg font-bold text-indigo-400">
                      {formatDate(nextDate)}
                    </p>
                    <p className="text-xs text-indigo-400/70">
                      {formatDistanceToNow(nextDate, { addSuffix: true })}
                    </p>
                  </div>

                  {/* Withdrawal days */}
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Withdrawal Days
                    </p>
                    <div className="flex gap-2">
                      {WITHDRAWAL_DAYS.map((day) => (
                        <div
                          key={day}
                          className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-center"
                        >
                          <p className="text-sm font-bold">{day}
                            <span className="text-[10px] text-muted-foreground">
                              {day === 1
                                ? "st"
                                : day === 11
                                  ? "th"
                                  : "st"}
                            </span>
                          </p>
                          <p className="text-[10px] uppercase text-muted-foreground">
                            Each Month
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Greyed-out profit */}
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Available Profit
                        </p>
                        <p className="text-lg font-bold text-white/40">
                          {formatCurrency(availableProfit)}
                        </p>
                      </div>
                      <Ban className="h-5 w-5 text-white/15" />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground/60">
                      Available on {formatDate(nextDate)}
                    </p>
                  </div>

                  {/* Disabled button */}
                  <button
                    disabled
                    className="btn-primary mt-4 w-full opacity-40"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Withdraw USDC
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ---- Withdrawal Rules ---- */}
          <div className="glass mb-4">
            <div className="px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">
                  Withdrawal Rules
                </h3>
              </div>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-xs text-muted-foreground">
                  <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500/50" />
                  Only profit is withdrawable (not your principal deposit)
                </li>
                <li className="flex items-start gap-2 text-xs text-muted-foreground">
                  <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500/50" />
                  Withdrawals are processed on the{" "}
                  {WITHDRAWAL_DAYS.map((d, i) => (
                    <span key={d}>
                      {i > 0 && (i === WITHDRAWAL_DAYS.length - 1 ? " and " : ", ")}
                      {d}
                      {d === 1
                        ? "st"
                        : d === 11
                          ? "th"
                          : "st"}
                    </span>
                  ))}{" "}
                  of each month (UTC)
                </li>
                <li className="flex items-start gap-2 text-xs text-muted-foreground">
                  <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500/50" />
                  Withdrawals are in USDC on the Base network
                </li>
                <li className="flex items-start gap-2 text-xs text-muted-foreground">
                  <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500/50" />
                  Requests may take up to 24 hours to be processed
                </li>
              </ul>
            </div>
          </div>

          {/* ---- Recent Withdrawal History ---- */}
          <div className="glass">
            <div className="px-5 py-4">
              <h3 className="mb-3 text-sm font-semibold">
                Recent Withdrawals
              </h3>

              {!withdrawals || withdrawals.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Wallet className="h-8 w-8 text-white/10" />
                  <p className="text-xs text-muted-foreground">
                    No withdrawals yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {withdrawals.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10">
                          <ArrowRight className="h-4 w-4 rotate-45 text-red-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {formatCurrency(Number(tx.amount))}
                            </p>
                            <span className="text-[10px] text-muted-foreground">
                              {tx.token}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(tx.createdAt)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={tx.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
