"use client";

import { useState, useCallback } from "react";
import { useWriteContract, useAccount, useReadContract } from "wagmi";
import { parseUnits } from "viem";
import { usePrivy } from "@privy-io/react-auth";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { GlassCard } from "./glass-card";
import { TOKEN_CONFIG, MIN_DEPOSIT_AMOUNT } from "@/lib/constants";
import { Loader2, Wallet, Coins, ArrowDownCircle } from "lucide-react";

type TokenType = "USDC" | "USDT";

const APP_WALLET_ADDRESS = (process.env
  .NEXT_PUBLIC_APP_WALLET_ADDRESS || "") as `0x${string}`;

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function DepositModal() {
  const { authenticated, login } = usePrivy();
  const { address } = useAccount();
  const [token, setToken] = useState<TokenType>("USDC");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<
    "form" | "approving" | "signing" | "confirming" | "done"
  >("form");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const tokenConfig = TOKEN_CONFIG[token];

  const { data: tokenBalance } = useReadContract({
    address: tokenConfig.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: allowance } = useReadContract({
    address: tokenConfig.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      address && APP_WALLET_ADDRESS
        ? [address, APP_WALLET_ADDRESS]
        : undefined,
    query: { enabled: !!address && !!APP_WALLET_ADDRESS },
  });

  const { writeContractAsync } = useWriteContract();

  const balance = tokenBalance
    ? Number(tokenBalance) / Math.pow(10, tokenConfig.decimals)
    : 0;
  const currentAllowance = allowance
    ? Number(allowance) / Math.pow(10, tokenConfig.decimals)
    : 0;
  const parsedAmount = amount ? parseFloat(amount) : 0;
  const hasSufficientBalance = parsedAmount <= balance;
  const hasSufficientAllowance = parsedAmount <= currentAllowance;
  const isValidAmount =
    parsedAmount >= MIN_DEPOSIT_AMOUNT && hasSufficientBalance;

  const handleMax = useCallback(() => {
    if (balance > 0) {
      setAmount(balance.toFixed(2));
    }
  }, [balance]);

  const handleDeposit = useCallback(async () => {
    if (!address || !APP_WALLET_ADDRESS || !isValidAmount) return;

    const value = parseUnits(amount, tokenConfig.decimals);

    try {
      // Step 1: Approve if needed
      if (!hasSufficientAllowance) {
        setStep("approving");
        await writeContractAsync({
          address: tokenConfig.address,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [APP_WALLET_ADDRESS, value],
        });
      }

      // Step 2: Transfer
      setStep("signing");
      const hash = await writeContractAsync({
        address: tokenConfig.address,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [APP_WALLET_ADDRESS, value],
      });

      setTxHash(hash);
      setStep("confirming");

      // Notify backend
      const res = await fetch("/api/deposit/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: hash,
          token,
          amount: parsedAmount,
          fromAddress: address,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to confirm deposit");
      }

      setStep("done");
      toast.success(`Deposit of ${amount} ${token} submitted successfully!`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Transaction failed or was rejected";
      toast.error(message);
      setStep("form");
      setTxHash(null);
    }
  }, [
    address,
    amount,
    token,
    tokenConfig,
    isValidAmount,
    hasSufficientAllowance,
    parsedAmount,
    writeContractAsync,
  ]);

  if (!authenticated) {
    return (
      <GlassCard className="flex flex-col items-center gap-4 py-12">
        <Wallet className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          Connect your wallet to start depositing
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
        <h2 className="text-lg font-semibold text-foreground">Deposit</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Min ${MIN_DEPOSIT_AMOUNT} — earn 10% monthly profit
        </p>
      </div>

      {/* Token Selector */}
      <div className="flex rounded-xl border border-card-border p-1 bg-muted/50">
        {(Object.keys(TOKEN_CONFIG) as TokenType[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setToken(t);
              setAmount("");
            }}
            disabled={step !== "form"}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              token === t
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Amount Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            Amount
          </label>
          <button
            onClick={handleMax}
            disabled={step !== "form" || balance <= 0}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Max: {balance.toFixed(2)}
          </button>
        </div>
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min={MIN_DEPOSIT_AMOUNT}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={step !== "form"}
            className={cn(
              "w-full rounded-xl border border-card-border bg-background px-4 py-3 pr-16 text-lg font-semibold",
              "placeholder:text-muted-foreground/30",
              "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "tabular-nums"
            )}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
            {token}
          </span>
        </div>
        {amount && !hasSufficientBalance && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <Coins className="h-3 w-3" />
            Insufficient balance
          </p>
        )}
        {amount && parsedAmount > 0 && parsedAmount < MIN_DEPOSIT_AMOUNT && (
          <p className="text-xs text-warning">
            Minimum deposit is ${MIN_DEPOSIT_AMOUNT}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleDeposit}
        disabled={
          step !== "form" || !isValidAmount || !APP_WALLET_ADDRESS
        }
        className={cn(
          "btn-primary w-full flex items-center justify-center gap-2",
          step !== "form" && "opacity-70 cursor-not-allowed"
        )}
      >
        {step === "approving" && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Approving {token}...
          </>
        )}
        {step === "signing" && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing Transaction...
          </>
        )}
        {step === "confirming" && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Confirming Deposit...
          </>
        )}
        {step === "done" && (
          <>
            <Wallet className="h-4 w-4" />
            Deposit Submitted
          </>
        )}
        {step === "form" && (
          <>
            <ArrowDownCircle className="h-4 w-4" />
            {hasSufficientAllowance
              ? `Deposit ${amount || "0"} ${token}`
              : `Approve & Deposit ${amount || "0"} ${token}`}
          </>
        )}
      </button>

      {/* Success State */}
      {step === "done" && txHash && (
        <div className="rounded-xl bg-success/10 border border-success/20 px-4 py-3">
          <p className="text-sm font-medium text-success">Deposit Initiated</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your deposit of {amount} {token} is being processed. Funds will be
            credited once the transaction is confirmed on-chain.
          </p>
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline mt-2 inline-block"
          >
            View on BaseScan
          </a>
        </div>
      )}

      {/* Wallet Not Connected */}
      {!address && authenticated && (
        <p className="text-xs text-center text-muted-foreground">
          No wallet connected. Connect a wallet in your Privy account to deposit.
        </p>
      )}
    </GlassCard>
  );
}
