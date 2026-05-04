<div align="center">
  <img src="public/logo.png" alt="FXMantra Logo" width="80" />
  <h1>FXMantra</h1>
  <p>Automated FX yield platform built on Base</p>
  <p>
    <a href="#-features">Features</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-api-reference">API Reference</a> •
    <a href="#-deployment">Deployment</a>
  </p>
</div>

---

## 📌 Overview

**FXMantra** is a decentralized yield platform that allows users to deposit **USDC** or **USDT** on the **Base** network and earn automated profit accruals. The platform handles authentication via **Privy**, reads on-chain transactions to confirm deposits, accrues monthly profits automatically, and supports withdrawals on a scheduled cycle.

## ✨ Features

- 🔐 **Authentication** — Email, Google, and wallet login via Privy with embedded wallets auto-created on sign-up
- 💰 **Multi-Token Deposits** — Accepts USDC and USDT on Base mainnet with on-chain transaction verification
- 📈 **Automated Profit Accrual** — Monthly profit accrual calculated at a configurable rate against deposited balances
- 📅 **Scheduled Withdrawals** — Withdrawals are gated to specific days (1st, 11th, 21st of each month UTC)
- 📊 **Dashboard** — Real-time balance overview with total deposited, accrued profit, and available profit
- 📋 **Transaction History** — Paginated transaction log with filtering by type, token, and status
- 🎨 **Modern UI** — Dark-themed glass-morphism design with responsive layout, loading states, and empty states

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev/) |
| **Auth** | [Privy](https://www.privy.io/) |
| **Blockchain** | [wagmi](https://wagmi.sh/), [viem](https://viem.sh/) |
| **State Management** | [React Query](https://tanstack.com/query) |
| **ORM** | [Prisma](https://www.prisma.io/) |
| **Database** | [Neon PostgreSQL](https://neon.tech/) |
| **Network** | [Base](https://base.org/) (Ethereum L2) |
| **Hosting** | [Vercel](https://vercel.com/) |

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm**, **yarn**, **pnpm**, or **bun**
- **Git**
- A **Neon PostgreSQL** database
- A **Privy** app
- A **Base mainnet** wallet (for the app treasury address)

### 1. Clone the Repository

```bash
git clone https://github.com/blinkinfo/fxmantra.git
cd fxmantra
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app public ID | Yes |
| `PRIVY_APP_SECRET` | Privy app secret key (server-side) | Yes |
| `NEXT_PUBLIC_APP_WALLET_ADDRESS` | Treasury wallet address on Base (receives deposits) | Yes |
| `APP_WALLET_PRIVATE_KEY` | Treasury wallet private key (for withdrawals) | Yes |
| `CRON_SECRET` | Random string to protect the accrual cron endpoint | Yes |
| `RPC_URL` | Base mainnet RPC endpoint | No (defaults to `https://mainnet.base.org`) |

> 🔒 Never commit `.env.local` to version control. It is included in `.gitignore`.

### 4. Initialize the Database

```bash
npx prisma generate
npx prisma db push
```

This creates the database schema with three models: **User**, **Balance**, and **Transaction**.

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## 🏗️ Project Structure

```
fxmantra/
├── app/
│   ├── api/                    # API route handlers
│   │   ├── balance/route.ts    # GET user balance by privyId
│   │   ├── cron/accrue/route.ts # POST monthly profit accrual (cron-protected)
│   │   ├── deposit/confirm/route.ts # POST verify and confirm on-chain deposits
│   │   ├── transactions/route.ts # GET paginated transaction history
│   │   ├── user/sync/route.ts  # POST upsert user from Privy auth callback
│   │   └── withdraw/route.ts   # POST initiate withdrawal (date-gated)
│   ├── dashboard/page.tsx      # User dashboard with live balances
│   ├── deposit/page.tsx        # Deposit flow with token selection
│   ├── transactions/page.tsx   # Transaction history with filters
│   ├── withdraw/page.tsx       # Withdrawal flow (date-gated)
│   ├── layout.tsx              # Root layout with font + metadata
│   ├── providers.tsx           # Privy + Wagmi + React Query providers
│   ├── page.tsx                # Public landing page
│   └── globals.css             # Tailwind + custom styles
├── components/ui/              # Reusable UI components
│   ├── glass-card.tsx          # Frosted glass container
│   ├── navbar.tsx              # Top navigation bar
│   ├── stat-card.tsx           # Balance stat display
│   ├── transaction-row.tsx     # Single transaction entry
│   ├── status-badge.tsx        # Status indicator (PENDING/COMPLETED/etc.)
│   ├── loading-skeleton.tsx    # Loading placeholder
│   ├── empty-state.tsx         # Empty list placeholder
│   ├── deposit-modal.tsx       # Deposit selection modal
│   ├── withdraw-modal.tsx      # Withdrawal form modal
│   └── index.ts                # Barrel exports
├── lib/                        # Shared utilities
│   ├── constants.ts            # Token config, profit rate, withdrawal days
│   ├── contracts.ts            # ERC-20 ABI
│   ├── prisma.ts               # Prisma client singleton
│   └── utils.ts                # cn() helper + formatting utilities
├── prisma/
│   └── schema.prisma           # Database models: User, Balance, Transaction
├── public/                     # Static assets
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies and scripts
└── .env.example                # Environment variable template
```

## 🗄️ Database Schema

### User

Represents an authenticated user managed via Privy.

| Field | Type | Description |
|---|---|---|
| `id` | Cuid | Primary key |
| `privyId` | String (unique) | Privy user identifier |
| `walletAddress` | String | On-chain wallet address |
| `email` | String | User email address |
| `createdAt` | DateTime | Account creation timestamp |

### Balance

Tracks the financial state for each user. One-to-one with User.

| Field | Type | Description |
|---|---|---|
| `userId` | String | Foreign key to User |
| `totalDeposited` | Decimal | Sum of all confirmed deposits |
| `totalWithdrawn` | Decimal | Sum of all confirmed withdrawals |
| `accruedProfit` | Decimal | Total profit earned over time |
| `withdrawnProfit` | Decimal | Profit already withdrawn by the user |
| `lastAccrualDate` | DateTime | Timestamp of the most recent accrual |

### Transaction

A ledger of all financial activity.

| Field | Type | Description |
|---|---|---|
| `id` | Cuid | Primary key |
| `userId` | String | Foreign key to User |
| `type` | Enum | `DEPOSIT`, `WITHDRAWAL`, or `ACCRUAL` |
| `token` | Enum | `USDC` or `USDT` |
| `amount` | Decimal | Transferred amount |
| `txHash` | String (unique) | On-chain transaction hash |
| `status` | Enum | `PENDING`, `CONFIRMED`, `COMPLETED`, `FAILED`, `PROCESSING` |
| `createdAt` | DateTime | Record creation timestamp |

## 🔌 API Reference

### `POST /api/user/sync`

Upserts a user record when a user logs in via Privy. Creates an initial zero balance for new users.

**Request body:**
```json
{ "privyId": "string", "walletAddress": "string?", "email": "string?" }
```

### `GET /api/balance`

Returns the full balance breakdown for a user.

**Query params:** `privyId`

**Response fields:** `totalDeposited`, `totalWithdrawn`, `accruedProfit`, `withdrawnProfit`, `availableProfit`, `totalBalance`

### `POST /api/deposit/confirm`

Verifies a blockchain transfer on Base and credits the user's balance. Checks transaction confirmation status (`minConfirms: 12`), validates the recipient matches the configured app wallet, and rejects duplicates by `txHash`.

**Request body:**
```json
{ "txHash": "string", "token": "USDC" | "USDT", "amount": "string", "fromAddress": "string", "privyId": "string" }
```

### `POST /api/cron/accrue`

Runs monthly profit accrual for all users with active deposits. Protected by `CRON_SECRET` via `Authorization: Bearer` header. Calculates profit using the configured monthly rate and prevents double-accrual within the same calendar month.

**Authorization:** `Bearer <CRON_SECRET>`

**Response:** `{ processed: number, totalProfitAccrued: string }`

### `POST /api/withdraw`

Initiates a withdrawal request. Enforces date-gated access (allowed only on the 1st, 11th, and 21st of each month UTC). Funds are deducted from accrued profit only.

**Request body:**
```json
{ "privyId": "string", "amount": "string", "token": "USDC" | "USDT" }
```

### `GET /api/transactions`

Returns paginated transaction history with optional filters.

**Query params:** `privyId`, `type?`, `token?`, `status?`, `page?` (default 1), `limit?` (max 50)

## ⚙️ Configuration

### Token Configuration (`lib/constants.ts`)

```typescript
const USDC = {
  symbol: "USDC",
  address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
  decimals: 6,
};

const USDT = {
  symbol: "USDT",
  address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2" as `0x${string}`,
  decimals: 6,
};

export const TOKEN_CONFIG = { USDC, USDT };
```

Both tokens are on **Base mainnet** with 6 decimal places.

### Profit Rate & Withdrawal Schedule

```typescript
export const MONTHLY_PROFIT_RATE = 0.0196;  // 1.96% monthly
export const WITHDRAWAL_DAYS = [1, 11, 21] as const; // UTC dates
```

### Cron Schedule

The accrual endpoint should be triggered monthly. Recommended Vercel cron:

```
0 0 1 * *
```

(Fires at midnight UTC on the 1st of each month)

## 🌐 Pages

| Route | Description |
|---|---|
| `/` | Public landing page with hero, stats, features, and steps |
| `/dashboard` | Authenticated dashboard showing balances, quick actions, and recent transactions |
| `/deposit` | Token selection (USDC/USDT) with deposit address, QR code, and network guide |
| `/withdraw` | Withdrawal form with available profit display and date-gate messaging |
| `/transactions` | Filterable transaction history with pagination |

## 🎨 UI Components

All components use a **glass-morphism** design system with:

- Frosted glass panels (`bg-black/30 + backdrop-blur-xl + border-white/10`)
- Gradient accent borders (`radial-gradient` for corner-to-corner glow)
- Animated background glow blobs (purple `#a855f7` and sky blue `#38bdf8`)
- Consistent spacing scale (`gap-4`, `py-6`, `px-6`)
- Lucide icon set for all iconography
- Toast notifications via `react-hot-toast`

## 📦 NPM Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `next dev` | Start development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `lint` | `eslint` | Run ESLint |
| `type-check` | `tsc --noEmit` | Type checking without emitting |
| `db:generate` | `prisma generate` | Generate Prisma client |
| `db:push` | `prisma db push` | Push schema to database |
| `db:studio` | `prisma studio` | Open Prisma Studio UI |
| `db:migrate` | `prisma migrate dev` | Create and apply migrations |
| `db:reset` | `prisma migrate reset` | Reset database (destructive) |

## 🚢 Deployment

### Vercel (Recommended)

1. Connect this repository to Vercel
2. Set all environment variables in Vercel's dashboard
3. Deploy — Vercel automatically sets `VERCEL_URL`
4. Configure a cron job (e.g., Vercel Cron or an external scheduler like Cron-job.org) to `POST` `/api/cron/accrue` with `Authorization: Bearer $CRON_SECRET`

### Environment Variables for Production

All variables from `.env.example` must be set in the hosting environment. The `APP_WALLET_PRIVATE_KEY` should be stored as a **secret** (not exposed in build logs).

## 🛡️ Security Notes

- **Never commit** `.env.local` or any file containing private keys
- `RPC_URL` defaults to the public Base RPC; use a private RPC (Alchemy, Infura) for production reliability
- The `CRON_SECRET` should be a cryptographically random string — generate one with `openssl rand -hex 32`
- Deposit confirmations wait for **12 block confirmations** before crediting, which is approximately 30 seconds on Base
- The accrual endpoint is protected by `CRON_SECRET` and uses a double-accrual guard that checks the current calendar month

## 📄 License

MIT License — see `LICENSE` for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
