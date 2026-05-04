import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MONTHLY_PROFIT_RATE } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error("CRON_SECRET is not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth(); // 0-indexed

    // Find all users who have deposits and have NOT been accrued this month
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
      include: {
        user: true,
      },
    });

    let totalProfitAccrued = 0;
    let processed = 0;

    // Process each user in a transaction for atomicity
    for (const balance of balances) {
      const totalDeposited = Number(balance.totalDeposited);
      const monthlyProfit = totalDeposited * MONTHLY_PROFIT_RATE;

      if (monthlyProfit <= 0) continue;

      await prisma.$transaction(async (tx) => {
        // Create accrual transaction record
        await tx.transaction.create({
          data: {
            userId: balance.userId,
            type: "ACCRUAL",
            token: "USDC",
            amount: monthlyProfit,
            status: "COMPLETED",
          },
        });

        // Update balance
        await tx.balance.update({
          where: { id: balance.id },
          data: {
            accruedProfit: {
              increment: monthlyProfit,
            },
            lastAccrualDate: now,
          },
        });
      });

      totalProfitAccrued += monthlyProfit;
      processed++;
    }

    return NextResponse.json({
      processed,
      totalProfitAccrued: totalProfitAccrued.toFixed(6),
    });
  } catch (error) {
    console.error("Error running profit accrual:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
