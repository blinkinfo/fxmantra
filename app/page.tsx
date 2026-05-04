"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useLogin } from "@privy-io/react-auth";
import { motion, useInView } from "framer-motion";
import {
  Wallet,
  ArrowDownCircle,
  TrendingUp,
  ShieldCheck,
  Zap,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_DESCRIPTION, MONTHLY_PROFIT_RATE } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Shared animation variants
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.15, ease: "easeOut" as const },
  }),
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

// ---------------------------------------------------------------------------
// Section component that triggers animation when it scrolls into view
// ---------------------------------------------------------------------------

function AnimatedSection({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      id={id}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Step card for "How It Works"
// ---------------------------------------------------------------------------

function StepCard({
  icon: Icon,
  step,
  title,
  description,
  index,
}: {
  icon: React.ElementType;
  step: string;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      className={cn(
        "glass glass-hover relative flex flex-col items-center px-6 py-10 text-center",
        "md:items-start md:text-left"
      )}
    >
      {/* Step number badge */}
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground md:left-6 md:-translate-x-0">
        {step}
      </span>

      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-7 w-7 text-primary" />
      </div>

      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Stat item
// ---------------------------------------------------------------------------

function StatItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  const router = useRouter();
  const { authenticated, ready } = usePrivy();
  const { login } = useLogin({
    onComplete: () => router.push("/dashboard"),
  });

  // Redirect authenticated users away from landing page
  useEffect(() => {
    if (ready && authenticated) {
      router.replace("/dashboard");
    }
  }, [ready, authenticated, router]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Don't render the page content if already authenticated (redirect in flight)
  if (authenticated) return null;

  const profitPercent = MONTHLY_PROFIT_RATE * 100;

  return (
    <main className="relative min-h-dvh bg-background text-foreground">
      {/* ================================================================= */}
      {/* SECTION 1 – HERO                                                 */}
      {/* ================================================================= */}
      <section className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-24">
        {/* Animated gradient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="bg-gradient-animate absolute -left-1/4 -top-1/4 h-[500px] w-[500px] rounded-full opacity-15 blur-[100px] md:h-[700px] md:w-[700px]" />
          <div className="bg-gradient-animate absolute -bottom-1/4 -right-1/4 h-[400px] w-[400px] rounded-full opacity-10 blur-[80px] md:h-[600px] md:w-[600px]" />
          <div className="bg-gradient-animate absolute left-1/3 top-1/3 h-[300px] w-[300px] rounded-full opacity-10 blur-[120px]" />
        </div>

        {/* Content */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 flex max-w-2xl flex-col items-center text-center"
        >
          {/* Tagline */}
          <motion.div
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary"
          >
            <Zap className="h-3.5 w-3.5" />
            Built on Base — Powered by Smart Contracts
          </motion.div>

          {/* Main heading */}
          <motion.h1
            variants={fadeUp}
            className="mb-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl"
          >
            Earn{" "}
            <span className="gradient-text">{profitPercent}% Monthly</span>{" "}
            <br className="hidden sm:block" />
            on Your Crypto
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={fadeUp}
            className="mb-8 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {APP_DESCRIPTION}
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center gap-4 sm:flex-row"
          >
            <button
              onClick={() => login()}
              className="btn-primary min-w-[200px] px-8 py-3 text-base"
            >
              Get Started
            </button>
            <a
              href="#how-it-works"
              className="btn-outline inline-flex items-center gap-2 px-8 py-3 text-base"
            >
              How It Works
              <ChevronDown className="h-4 w-4" />
            </a>
          </motion.div>

          {/* Trusted by line */}
          <motion.p
            variants={fadeUp}
            className="mt-10 text-xs text-muted-foreground/60"
          >
            No hidden fees. No lock-up periods. Your keys, your crypto.
          </motion.p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" as const }}
          >
            <ChevronDown className="h-6 w-6 text-muted-foreground/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* ================================================================= */}
      {/* SECTION 2 – HOW IT WORKS                                          */}
      {/* ================================================================= */}
      <AnimatedSection
        id="how-it-works"
        className="relative z-10 px-6 pb-24 pt-16 md:pb-32 md:pt-24"
      >
        {/* Section heading */}
        <motion.div variants={fadeUp} className="mb-12 text-center">
          <h2 className="mb-3 text-2xl font-bold sm:text-3xl">
            How It Works
          </h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Three simple steps to start earning passive yield on your
            stablecoins.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          <StepCard
            icon={Wallet}
            step="01"
            title="Connect Your Wallet"
            description="Link your wallet using MetaMask, Coinbase Wallet, or any WalletConnect-compatible provider. Sign in with email or Google, too."
            index={0}
          />
          <StepCard
            icon={ArrowDownCircle}
            step="02"
            title="Deposit USDC or USDT"
            description="Transfer USDC or USDT to your fxmantra balance. Minimum deposit is 1 USDC/USDT. Your funds remain on-chain at all times."
            index={1}
          />
          <StepCard
            icon={TrendingUp}
            step="03"
            title={`Earn ${profitPercent}% Monthly`}
            description={`Profits accrue automatically on the 1st of each month. Withdraw your earnings on the 1st, 11th, and 21st. No lock-up.`}
            index={2}
          />
        </div>
      </AnimatedSection>

      {/* ================================================================= */}
      {/* SECTION 3 – STATS / TRUST                                         */}
      {/* ================================================================= */}
      <AnimatedSection className="relative z-10 px-6 pb-24 md:pb-32">
        <motion.div
          variants={fadeUp}
          className="glass mx-auto max-w-3xl p-8 md:p-12"
        >
          <div className="mb-8 text-center">
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h2 className="text-xl font-bold sm:text-2xl">
              Why {APP_NAME}?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Transparent, automated, and built for the long term.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <StatItem
              icon={TrendingUp}
              label="Monthly Profit"
              value={`${profitPercent}%`}
            />
            <StatItem
              icon={ArrowDownCircle}
              label="Withdrawal Days / Month"
              value="3 (1st, 11th, 21st)"
            />
            <StatItem icon={Zap} label="Network" value="Base (Ethereum L2)" />
            <StatItem
              icon={ShieldCheck}
              label="Security"
              value="Non-custodial by design"
            />
          </div>

          <motion.div
            variants={fadeUp}
            className="mt-8 rounded-xl border border-primary/10 bg-primary/[0.03] p-4 text-center text-sm text-muted-foreground"
          >
            <p>
              <strong className="text-foreground">Important:</strong> While
              profits are not guaranteed, our model is designed for sustainable,
              automated yield generation. Deposit only what you can commit for
              at least one full accrual cycle.
            </p>
          </motion.div>
        </motion.div>
      </AnimatedSection>

      {/* ================================================================= */}
      {/* SECTION 4 – FINAL CTA                                             */}
      {/* ================================================================= */}
      <AnimatedSection className="relative z-10 px-6 pb-32">
        <motion.div
          variants={fadeUp}
          className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-primary/20"
        >
          {/* Background glow */}
          <div className="bg-gradient-animate absolute inset-0 opacity-5" />

          <div className="relative px-8 py-16 text-center md:px-16 md:py-20">
            <h2 className="mb-3 text-2xl font-bold sm:text-3xl">
              Ready to Start Earning?
            </h2>
            <p className="mx-auto mb-8 max-w-sm text-sm text-muted-foreground">
              Connect your wallet and deposit USDC or USDT in under a minute.
              No lock-up, no hidden fees.
            </p>
            <button
              onClick={() => login()}
              className="btn-primary px-10 py-3 text-base"
            >
              Start Earning Now
            </button>
          </div>
        </motion.div>
      </AnimatedSection>

      {/* ================================================================= */}
      {/* FOOTER                                                            */}
      {/* ================================================================= */}
      <footer className="relative z-10 border-t border-border px-6 py-8 text-center text-xs text-muted-foreground/60">
        <p>
          &copy; {new Date().getFullYear()} {APP_NAME}. Built on Base. Not
          financial advice.
        </p>
      </footer>
    </main>
  );
}
