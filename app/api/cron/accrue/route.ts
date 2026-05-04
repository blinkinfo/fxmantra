import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MONTHLY_PROFIT_RATE } from "@/lib/constants";

function verifyAuth(request: NextRequest): boolean {
  // Support both Authorization header (POST) and ?secret query param (Vercel cron GET)
  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("CRON_SECRET is not configured");
    return false;
  }

  if (authHeader === `Bearer ${expectedSecret}`) return true;
  if (querySecret === expectedSecret) return true;
  return false;
}

async function runAccrual() {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  const balances = await prisma.balance.findMany({
    where: {
      totalDeposited: { gt: 0 },
      OR: [
        { lastAccrualDate: null },
        {
          lastAccrualDate: {
            not: {
              gte: new Date(Date.UTC(currentYear, currentMonth, 1)),
              lt: new Date(Date.UTC(currentYear, currentMonth + 1, 1)),
            },
          },
        },
      ],
    },
    include: { user: true },
  });

  let totalProfitAccrued = 0;
  let processed = 0;

  for (const balance of balances) {
    const totalDeposited = Number(balance.totalDeposited);
    const monthlyProfit = totalDeposited * MONTHLY_PROFIT_RATE;
    if (monthlyProfit <= 0) continue;

    await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          userId: balance.userId,
          type: "ACCRUAL",
          token: "USDC",
          amount: monthlyProfit,
          status: "COMPLETED",
        },
      });
      await tx.balance.update({
        where: { id: balance.id },
        data: {
          accruedProfit: { increment: monthlyProfit },
          lastAccrualDate: now,
        },
      });
    });

    totalProfitAccrued += monthlyProfit;
    processed++;
  }

  return { processed, totalProfitAccrued };
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await runAccrual();
    return NextResponse.json({
      processed: result.processed,
      totalProfitAccrued: result.totalProfitAccrued.toFixed(6),
    });
  } catch (error) {
    console.error("Error running profit accrual:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await runAccrual();
    return NextResponse.json({
      processed: result.processed,
      totalProfitAccrued: result.totalProfitAccrued.toFixed(6),
    });
  } catch (error) {
    console.error("Error running profit accrual:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
