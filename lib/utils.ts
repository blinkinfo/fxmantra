import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isWithinInterval, parseISO, setDate } from "date-fns";
import { WITHDRAWAL_DAYS } from "./constants";

// Tailwind class merge
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency (USDC/USDT display)
export function formatCurrency(
  amount: number | string | bigint,
  options?: { decimals?: number; symbol?: boolean }
): string {
  const num = typeof amount === "bigint" ? Number(amount) : Number(amount);
  const d = options?.decimals ?? 2;
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
  return options?.symbol ?? true
    ? `$${formatted}`
    : formatted;
}

// Check if today is a withdrawal day (UTC)
export function isWithdrawalDay(): boolean {
  const today = new Date();
  const dayOfMonth = today.getUTCDate();
  return WITHDRAWAL_DAYS.includes(dayOfMonth as 1 | 11 | 21);
}

// Get next withdrawal date
export function getNextWithdrawalDate(): Date {
  const now = new Date();
  const today = now.getUTCDate();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();

  // Find the next withdrawal day
  for (const day of WITHDRAWAL_DAYS) {
    if (today < day) {
      return new Date(Date.UTC(currentYear, currentMonth, day));
    }
    if (today === day) {
      // If it's a withdrawal day, next is the next withdrawal day
      // unless it's the last one of the month
      const idx = WITHDRAWAL_DAYS.indexOf(day);
      if (idx < WITHDRAWAL_DAYS.length - 1) {
        return new Date(
          Date.UTC(currentYear, currentMonth, WITHDRAWAL_DAYS[idx + 1])
        );
      }
    }
  }

  // After the 21st, next is the 1st of next month
  return new Date(Date.UTC(currentYear, currentMonth + 1, 1));
}

// Format date for display
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

// Format date with time
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

// Calculate current available profit
export function calculateAvailableProfit(
  accruedProfit: number,
  withdrawnProfit: number
): number {
  return Math.max(0, accruedProfit - withdrawnProfit);
}

// Calculate total balance
export function calculateTotalBalance(
  totalDeposited: number,
  accruedProfit: number,
  totalWithdrawn: number
): number {
  return totalDeposited + accruedProfit - totalWithdrawn;
}

// Truncate wallet address for display
export function truncateAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
