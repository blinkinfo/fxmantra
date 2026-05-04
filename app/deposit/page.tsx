"use client";

import { useState, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useReadContract, useWriteContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Wallet,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Sparkles,
  Zap,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import {
  CHAIN_ID,
  CHAIN_NAME,
  TOKEN_CONFIG,
  MIN_DEPOSIT_AMOUNT,
  MONTHLY_PROFIT_RATE,
  APP_NAME,
} from "@/lib/constants";
import { ERC20_ABI } from "@/lib/contracts";
import { cn, formatCurrency, truncateAddress } from "@/lib/utils";

type TokenType = "USDC" | "USDT";

type DepositStage =
  | "idle"
  | "approving"
  | "confirming"
  | "success"
  | "error";

const APP_WALLET = process.env.NEXT_PUBLIC_APP_WALLET_ADDRESS as `0x${string}` | undefined;

export default function DepositPage() {
  const { authenticated, ready, user, login } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const address = wallet?.address as `0x${string}` | undefined;

  const [token, setToken] = useState<TokenType>("USDC");
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<DepositStage>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [errorMsg, setErrorMsg] = useState("");


  const tokenConfig = TOKEN_CONFIG[token];

  // Fetch token balance via ERC20 balanceOf
  const { data: balanceData, isLoading: balanceLoading } = useReadContract({
    address: tokenConfig.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  });

  // useWriteContract
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const balance = balanceData
    ? Number(formatUnits(balanceData as bigint, tokenConfig.decimals))
    : 0;

  const parsedAmount = parseFloat(amount);
  const isValidAmount =
    !isNaN(parsedAmount) &&
    parsedAmount >= MIN_DEPOSIT_AMOUNT &&
    parsedAmount <= balance;
  const canDeposit = stage === "idle" && !!address && isValidAmount;

  const resetForm = useCallback(() => {
    setStage("idle");
    setTxHash(null);
    setErrorMsg("");
    setAmount("");
  }, []);

  const handleDeposit = async () => {
    if (!address || !APP_WALLET) return;
    if (!isValidAmount) return;

    setStage("approving");
    setErrorMsg("");

    try {
      // Step 1: Write ERC20 transfer transaction
      const decimals = tokenConfig.decimals;
      const value = parseUnits(amount, decimals);

      const hash = await writeContractAsync({
        address: tokenConfig.address,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [APP_WALLET, value],
        chainId: CHAIN_ID,
      });

      setTxHash(hash);
      setStage("confirming");

      // Step 2: Call API to confirm the deposit
      const res = await fetch("/api/deposit/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: hash,
          token,
          amount: parsedAmount,
          fromAddress: address,
          privyId: user?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm deposit");
      }

      setStage("success");
      toast.success(`Successfully deposited ${parsedAmount} ${token}!`, {
        duration: 5000,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setErrorMsg(message);
      setStage("error");
      toast.error(message);
    }
  };

  const handleMax = () => {
    if (balance > 0) {
      setAmount(balance.toFixed(6));
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty, numbers, and one decimal point
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setAmount(val);
    }
  };

  const handleConnectWallet = async () => {
    try {
      await login();
    } catch {
      // Privy handles UI
    }
  };

  // Not ready yet
  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="glass p-8 max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-amber-400 flex items-center justify-center mx-auto">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold mb-2">Connect to Deposit</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to start depositing and earning {MONTHLY_PROFIT_RATE * 100}% monthly profit on {CHAIN_NAME}.
            </p>
          </div>
          <button onClick={handleConnectWallet} className="btn-primary w-full text-base py-3">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Main deposit UI
  return (
    <div className="min-h-screen px-4 pt-6 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Deposit</h1>
          <p className="text-xs text-muted-foreground">
            Add funds to your {APP_NAME} account
          </p>
        </div>
      </div>

      {/* Wallet info */}
      {address && (
        <div className="glass px-4 py-3 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Wallet</span>
            <span className="font-mono text-xs">{truncateAddress(address)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-muted-foreground">{CHAIN_NAME}</span>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Success State */}
        {stage === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="glass p-8 text-center space-y-6 relative overflow-hidden"
          >
            <ConfettiEffect />
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold gradient-text mb-1">
                Deposit Successful!
              </h2>
              <p className="text-3xl font-bold text-accent mt-3">
                {parsedAmount} {token}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                has been added to your account
              </p>

              {txHash && (
                <a
                  href={`https://basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary mt-3 hover:underline"
                >
                  View on Basescan
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              <div className="flex flex-col gap-3 mt-6">
                <Link href="/dashboard" className="btn-primary w-full text-center">
                  View Dashboard
                </Link>
                <button onClick={resetForm} className="btn-outline w-full text-sm">
                  Make Another Deposit
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {stage === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass p-6 text-center space-y-4 border-red-500/20"
          >
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <span className="text-3xl">!</span>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Deposit Failed</h3>
              <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
            </div>
            <button onClick={resetForm} className="btn-primary w-full">
              Try Again
            </button>
          </motion.div>
        )}

        {/* Processing State */}
        {(stage === "approving" || stage === "confirming") && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass p-8 text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto relative">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {stage === "approving" ? "Approve Transaction" : "Confirming Deposit"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {stage === "approving"
                  ? "Please confirm the transaction in your wallet"
                  : "Waiting for blockchain confirmation..."}
              </p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 text-xs">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                  stage === "approving"
                    ? "bg-primary/20 text-primary"
                    : "text-accent"
                )}
              >
                {stage === "confirming" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Sign Transaction
              </div>
              <div className="w-6 h-px bg-border" />
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                  stage === "confirming"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground"
                )}
              >
                {stage === "confirming" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span className="w-3.5 h-3.5" />
                )}
                Confirm On-Chain
              </div>
            </div>

            {txHash && (
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                View transaction
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </motion.div>
        )}

        {/* Deposit Form */}
        {stage === "idle" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass p-6 space-y-6"
          >
            {/* Token Selector */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Token
              </label>
              <div className="glass inline-flex p-1 rounded-full w-full">
                <button
                  onClick={() => setToken("USDC")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all",
                    token === "USDC"
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">$</span>
                  </div>
                  USDC
                </button>
                <button
                  onClick={() => setToken("USDT")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all",
                    token === "USDT"
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">$</span>
                  </div>
                  USDT
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-muted-foreground">
                  Amount
                </label>
                <div className="flex items-center gap-1.5 text-xs">
                  {balanceLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <span className="text-muted-foreground">Balance:</span>
                      <span className="font-medium">
                        {balance.toFixed(2)} {token}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="glass flex items-center gap-2 px-4 py-3 rounded-2xl focus-within:border-primary/50 focus-within:shadow-[0_0_24px_rgba(99,102,241,0.08)] transition-all">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground/30 w-full min-w-0"
                  autoFocus
                />
                <span className="text-lg font-semibold text-muted-foreground shrink-0">
                  {token}
                </span>
                {balance > 0 && (
                  <button
                    onClick={handleMax}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors shrink-0 px-2 py-1 rounded-lg bg-primary/10"
                  >
                    MAX
                  </button>
                )}
              </div>

              {/* Validation hints */}
              {amount && !isValidAmount && (
                <p className="text-xs text-destructive mt-2">
                  {parsedAmount < MIN_DEPOSIT_AMOUNT
                    ? `Minimum deposit is ${MIN_DEPOSIT_AMOUNT} ${token}`
                    : parsedAmount > balance
                    ? "Insufficient balance"
                    : ""}
                </p>
              )}
            </div>

            {/* Deposit Info Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="glass px-3 py-3 rounded-xl text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Min Deposit
                </p>
                <p className="text-sm font-semibold">
                  {MIN_DEPOSIT_AMOUNT} {token}
                </p>
              </div>
              <div className="glass px-3 py-3 rounded-xl text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Network
                </p>
                <p className="text-sm font-semibold">{CHAIN_NAME}</p>
              </div>
              <div className="glass px-3 py-3 rounded-xl text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Monthly Profit
                </p>
                <p className="text-sm font-semibold text-accent">
                  {MONTHLY_PROFIT_RATE * 100}%
                </p>
              </div>
            </div>

            {/* Gas Notice */}
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-warning/5 border border-warning/10">
              <Zap className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                You need a small amount of ETH on {CHAIN_NAME} for gas fees. 
                Your deposit earns {MONTHLY_PROFIT_RATE * 100}% profit 
                compounded monthly with payouts on the 1st, 11th, and 21st.
              </p>
            </div>

            {/* Deposit Button */}
            <button
              onClick={handleDeposit}
              disabled={!canDeposit}
              className={cn(
                "btn-primary w-full text-base py-3.5 flex items-center justify-center gap-2",
                !canDeposit && "opacity-50 cursor-not-allowed"
              )}
            >
              {!address ? (
                <>
                  <Wallet className="w-5 h-5" />
                  Connect Wallet
                </>
              ) : !amount ? (
                <>
                  <TrendingUp className="w-5 h-5" />
                  Enter Amount
                </>
              ) : !isValidAmount ? (
                "Invalid Amount"
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Deposit {parsedAmount} {token}
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer note */}
      {stage === "idle" && (
        <p className="text-center text-xs text-muted-foreground mt-6">
          By depositing you agree to our Terms of Service
        </p>
      )}
    </div>
  );
}

// Simple confetti animation using framer-motion
function ConfettiEffect() {
  const colors = ["#6366f1", "#a78bfa", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6"];
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 8 + 4,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: "-10px",
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: "2px",
            rotate: p.rotation,
          }}
          initial={{ y: -20, opacity: 1 }}
          animate={{
            y: 500,
            opacity: 0,
            rotate: p.rotation + 360 + Math.random() * 360,
          }}
          transition={{
            duration: 1.5 + Math.random() * 1.5,
            delay: p.delay,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}
