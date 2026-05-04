type TokenType = "USDC" | "USDT";

// Base mainnet
export const CHAIN_ID = 8453;
export const CHAIN_NAME = "Base";

// USDC on Base
export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const USDC_DECIMALS = 6;
export const USDC_SYMBOL = "USDC";

// USDT on Base (Bridged)
export const USDT_ADDRESS = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2" as const;
export const USDT_DECIMALS = 6;
export const USDT_SYMBOL = "USDT";

export const TOKEN_CONFIG: Record<
  TokenType,
  { address: `0x${string}`; decimals: number; symbol: string }
> = {
  USDC: { address: USDC_ADDRESS, decimals: USDC_DECIMALS, symbol: USDC_SYMBOL },
  USDT: { address: USDT_ADDRESS, decimals: USDT_DECIMALS, symbol: USDT_SYMBOL },
};

// Withdrawal windows (day of month, UTC)
export const WITHDRAWAL_DAYS = [1, 11, 21] as const;

// Profit rate: 10% per month
export const MONTHLY_PROFIT_RATE = 0.1;

// Accrual runs on the 1st of each month
export const ACCRUAL_CRON = "0 0 1 * *";

// Minimum deposit: 1 USDC/USDT
export const MIN_DEPOSIT_AMOUNT = 1;

// Transaction statuses
export enum TxStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  FAILED = "FAILED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
}

export enum TxType {
  DEPOSIT = "DEPOSIT",
  WITHDRAWAL = "WITHDRAWAL",
  ACCRUAL = "ACCRUAL",
}

export const APP_NAME = "fxmantra";
export const APP_DESCRIPTION =
  "Deposit USDC/USDT and earn 10% profit every month. Withdraw your earnings on the 1st, 11th, and 21st.";
