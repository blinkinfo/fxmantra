"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Coins,
  DollarSign,
  Landmark,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatDistanceToNow, isToday } from "date-fns";
import { GlassCard } from "@/components/ui/glass-card";
import { StatCard } from "@/components/ui/stat-card";
import { TransactionRow } from "@/components/ui/transaction-row";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BalanceSkeleton,
  StatCardSkeleton,
  TransactionRowSkeleton,
} from "@/components/ui/loading-skeleton";
import {
  formatCurrency,
  formatDate,
  getNextWithdrawalDate,
  isWithdrawalDay,
} from "@/lib/utils";
import Link from "next/link";

// ------------------------------------------------------------------ Types
interface BalanceData {
  totalDeposited: number;
  totalWithdrawn: number;
  accruedProfit: number;
  withdrawnProfit: number;
  availableProfit: number;
  totalBalance: number;
}

interface Transaction {
  id: string;
  type: string;
  token: string;
  amount: number;
  status: string;
  txHash?: string | null;
  createdAt: string;
}

interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
}

// ------------------------------------------------------------------ Fetch helpers
async function fetchBalance(privyId: string): Promise<BalanceData> {
  const res = await fetch(`/api/balance?privyId=${encodeURIComponent(privyId)}`);
  if (!res.ok) throw new Error("Failed to fetch balance");
  return res.json();
}

async function fetchRecentTransactions(privyId: string): Promise<Transaction[]> {
  const res = await fetch(`/api/transactions?privyId=${encodeURIComponent(privyId)}&limit=5`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  const data: TransactionsResponse = await res.json();
  return data.transactions;
}

// ------------------------------------------------------------------ Main page
export default function DashboardPage() {
  const { ready, authenticated, login, user } = usePrivy();

  const {
    data: balance,
    isLoading: balanceLoading,
    error: balanceError,
  } = useQuery<BalanceData>({
    queryKey: ["balance", user?.id],
    queryFn: () => fetchBalance(user?.id!),
    refetchInterval: 30_000,
    enabled: ready && authenticated && !!user?.id,
  });

  const {
    data: transactions,
    isLoading: transactionsLoading,
  } = useQuery<Transaction[]>({
    queryKey: ["recent-transactions", user?.id],
    queryFn: () => fetchRecentTransactions(user?.id!),
    refetchInterval: 30_000,
    enabled: ready && authenticated && !!user?.id,
  });

  // --------------------------------------------------------- Loading
  if (!ready) {
    return <DashboardSkeleton />;
  }

  // --------------------------------------------------------- Unauthenticated
  if (ready && !authenticated) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          {/* Logo area */}
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <TrendingUp className="h-10 w-10 text-primary" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Welcome to fxmantra</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connect your wallet or sign in to view your portfolio, track
              profits, and manage withdrawals.
            </p>
          </div>

          <button
            onClick={() => login()}
            className="btn-primary w-full text-base py-3"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------- Authenticated
  const nextWithdrawal = getNextWithdrawalDate();
  const withdrawalOpen = isWithdrawalDay();
  const hasDeposits = balance && balance.totalDeposited > 0;
  const hasTransactions = transactions && transactions.length > 0;

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* ---- Balance hero ---- */}
      <section className="flex flex-col items-center gap-1 pt-8 pb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          Total Balance
        </span>

        {balanceLoading ? (
          <BalanceSkeleton />
        ) : balanceError ? (
          <p className="text-sm text-destructive">
            Could not load balance. Pull down to retry.
          </p>
        ) : (
          <span className="text-4xl sm:text-5xl font-bold gradient-text tracking-tight">
            {formatCurrency(balance?.totalBalance ?? 0)}
          </span>
        )}
      </section>

      {/* ---- Stat cards ---- */}
      <section className="grid grid-cols-2 gap-3 px-4">
        {balanceLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Total Deposited"
              value={formatCurrency(balance?.totalDeposited ?? 0)}
              icon={<Landmark className="h-4 w-4" />}
            />
            <StatCard
              label="Total Profit"
              value={formatCurrency(balance?.accruedProfit ?? 0)}
              icon={<TrendingUp className="h-4 w-4" />}
              accent
            />
            <StatCard
              label="Available Profit"
              value={formatCurrency(balance?.availableProfit ?? 0)}
              icon={<Wallet className="h-4 w-4" />}
            >
              <span className="text-[10px] text-muted-foreground">
                Withdrawable on withdrawal days
              </span>
            </StatCard>
            <StatCard
              label="Next Withdrawal"
              value={
                withdrawalOpen
                  ? "Today!"
                  : `in ${formatDistanceToNow(nextWithdrawal)}`
              }
              icon={<CalendarDays className="h-4 w-4" />}
              className={withdrawalOpen ? "border-accent/40 bg-accent/[0.02]" : ""}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(nextWithdrawal)}
                </span>
                {withdrawalOpen && (
                  <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent border border-accent/20">
                    Withdrawal Open
                  </span>
                )}
              </div>
            </StatCard>
          </>
        )}
      </section>

      {/* ---- Quick actions ---- */}
      <section className="flex gap-3 px-4">
        <Link
          href="/deposit"
          className="btn-primary flex flex-1 items-center justify-center gap-2 text-sm"
        >
          <ArrowDownLeft className="h-4 w-4" />
          Deposit
        </Link>
        <Link
          href="/withdraw"
          className={[
            "btn-outline flex flex-1 items-center justify-center gap-2 text-sm",
            !withdrawalOpen && "opacity-50 pointer-events-none",
          ].join(" ")}
        >
          <ArrowUpRight className="h-4 w-4" />
          Withdraw
        </Link>
      </section>
      {!withdrawalOpen && (
        <p className="text-center text-[10px] text-muted-foreground -mt-2">
          Withdrawals available on the 1st, 11th, and 21st
        </p>
      )}

      {/* ---- Recent transactions ---- */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Transactions
          </h2>
          {hasTransactions && (
            <Link
              href="/transactions"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              View all
            </Link>
          )}
        </div>

        {transactionsLoading ? (
          <GlassCard hover={false}>
            <div className="p-4">
              <div className="divide-y divide-white/5">
                <TransactionRowSkeleton />
                <TransactionRowSkeleton />
                <TransactionRowSkeleton />
              </div>
            </div>
          </GlassCard>
        ) : hasTransactions ? (
          <GlassCard hover={false}>
            <div className="divide-y divide-white/5">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
            </div>
          </GlassCard>
        ) : hasDeposits ? (
          <GlassCard hover={false}>
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No transactions yet. Deposits will appear here.
              </p>
            </div>
          </GlassCard>
        ) : (
          <EmptyState
            icon={<Coins className="h-6 w-6" />}
            title="No deposits yet"
            description="Make your first deposit to start earning 10% monthly profit on USDC/USDT."
            action={
              <Link href="/deposit" className="btn-primary text-sm">
                Make Your First Deposit
              </Link>
            }
          />
        )}
      </section>

      {/* ---- User info footer ---- */}
      {user?.wallet?.address && (
        <section className="px-4">
          <GlassCard hover={false} className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Connected Wallet</span>
              <span className="text-xs font-mono text-foreground">
                {user.wallet.address.slice(0, 6)}...{user.wallet.address.slice(-4)}
              </span>
            </div>
          </GlassCard>
        </section>
      )}
    </div>
  );
}

// Skeleton shown while Privy is initializing
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex flex-col items-center gap-1 pt-8 pb-2">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-12 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-3 px-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="flex gap-3 px-4">
        <div className="skeleton h-12 flex-1 rounded-full" />
        <div className="skeleton h-12 flex-1 rounded-full" />
      </div>
      <div className="px-4">
        <div className="skeleton mb-3 h-4 w-36" />
        <div className="glass">
          <div className="divide-y divide-white/5 p-4">
            <TransactionRowSkeleton />
            <TransactionRowSkeleton />
            <TransactionRowSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
