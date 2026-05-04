"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  ListFilter,
  RefreshCw,
  SearchX,
} from "lucide-react";
import { TxType } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { TransactionRow } from "@/components/ui/transaction-row";
import { TransactionRowSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";

// ---------- Types ----------

interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  token: string;
  status: string;
  txHash?: string | null;
  createdAt: string;
}

interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  totalPages: number;
}

// ---------- Filter config ----------

const TYPE_FILTERS = [
  { label: "All", value: null, icon: null },
  { label: "Deposits", value: TxType.DEPOSIT, icon: ArrowDownLeft },
  { label: "Withdrawals", value: TxType.WITHDRAWAL, icon: ArrowUpRight },
  { label: "Accruals", value: TxType.ACCRUAL, icon: Plus },
] as const;

const TOKEN_FILTERS = [
  { label: "All", value: null },
  { label: "USDC", value: "USDC" },
  { label: "USDT", value: "USDT" },
] as const;

const ITEMS_PER_PAGE = 20;

// ---------- Transactions content (split for Suspense boundary) ----------

function TransactionsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { authenticated, ready } = usePrivy();

  // Read filters from URL
  const activeType = searchParams.get("type") || null;
  const activeToken = searchParams.get("token") || null;
  const activePage = parseInt(searchParams.get("page") || "1", 10);

  // Build query URL
  const queryParams = new URLSearchParams();
  if (activeType) queryParams.set("type", activeType);
  if (activeToken) queryParams.set("token", activeToken);
  queryParams.set("page", String(activePage));
  queryParams.set("limit", String(ITEMS_PER_PAGE));

  const apiUrl = `/api/transactions?${queryParams.toString()}`;

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<TransactionsResponse>({
    queryKey: ["transactions", activeType, activeToken, activePage],
    queryFn: async () => {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    enabled: ready && authenticated,
  });

  // Update a single search param
  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 on filter change
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const loadMore = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(activePage + 1));
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams, activePage]);

  // Auth guard
  if (!ready || !authenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="skeleton mb-4 h-12 w-12 rounded-2xl" />
        <p className="text-sm text-muted-foreground">
          Connect your wallet to view transactions
        </p>
      </div>
    );
  }

  const transactions = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const hasMore = activePage < totalPages;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          {total > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {total} transaction{total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw
            className={cn("h-4 w-4", isFetching && "animate-spin")}
          />
        </button>
      </div>

      {/* Type filter chips */}
      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
        {TYPE_FILTERS.map((f) => {
          const isActive = activeType === f.value;
          const Icon = f.icon;
          return (
            <button
              key={f.label}
              onClick={() => setFilter("type", f.value)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "glass text-muted-foreground hover:text-foreground"
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Token filter chips */}
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {TOKEN_FILTERS.map((f) => {
          const isActive = activeToken === f.value;
          return (
            <button
              key={f.label}
              onClick={() => setFilter("token", f.value)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                isActive
                  ? "bg-white/[0.1] text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Transaction list */}
      {isLoading ? (
        <>
          {Array.from({ length: 5 }).map((_, i) => (
            <TransactionRowSkeleton key={i} />
          ))}
        </>
      ) : error ? (
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title="Something went wrong"
          description="Could not load your transactions. Try refreshing."
          className="py-12"
        />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={<ListFilter className="h-6 w-6" />}
          title="No transactions yet"
          description={
            activeType || activeToken
              ? "No transactions match your filters. Try a different filter."
              : "Your first deposit will appear here."
          }
          className="py-12"
        />
      ) : (
        <>
          <div className="space-y-3">
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={isFetching}
                className="btn-outline flex items-center gap-2"
              >
                {isFetching ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load More (${
                    total - activePage * ITEMS_PER_PAGE > 0
                      ? Math.min(
                          ITEMS_PER_PAGE,
                          total - activePage * ITEMS_PER_PAGE
                        )
                      : 0
                  } remaining)`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------- Wrapper with Suspense for useSearchParams ----------

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
          <div className="mb-6">
            <div className="skeleton mb-2 h-8 w-48" />
            <div className="skeleton h-4 w-32" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <TransactionRowSkeleton key={i} />
          ))}
        </div>
      }
    >
      <TransactionsContent />
    </Suspense>
  );
}
