import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WITHDRAWAL_DAYS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyId, amount, token } = body as {
      privyId: string;
      amount: string;
      token: string;
    };

    if (!privyId || !amount || !token) {
      return NextResponse.json(
        { error: "Missing required fields: privyId, amount, token" },
        { status: 400 }
      );
    }

    if (token !== "USDC" && token !== "USDT") {
      return NextResponse.json(
        { error: "Invalid token. Must be USDC or USDT" },
        { status: 400 }
      );
    }

    // Date-gated check: withdrawals only on 1st, 11th, 21st (UTC)
    const today = new Date();
    const dayOfMonth = today.getUTCDate();
    if (!(WITHDRAWAL_DAYS as readonly number[]).includes(dayOfMonth)) {
      return NextResponse.json(
        { error: "Withdrawals only allowed on the 1st, 11th, and 21st (UTC)" },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Find user with balance
    const user = await prisma.user.findUnique({
      where: { privyId },
      include: { balance: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!user.balance) {
      return NextResponse.json(
        { error: "Balance not found" },
        { status: 404 }
      );
    }

    // Calculate available profit
    const accruedProfit = Number(user.balance.accruedProfit);
    const withdrawnProfit = Number(user.balance.withdrawnProfit);
    const availableProfit = Math.max(0, accruedProfit - withdrawnProfit);

    if (parsedAmount > availableProfit) {
      return NextResponse.json(
        { error: "Insufficient available profit" },
        { status: 400 }
      );
    }

    // Create withdrawal transaction and update balance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "WITHDRAWAL",
          token,
          amount: parsedAmount,
          status: "PENDING",
        },
      });

      const updatedBalance = await tx.balance.update({
        where: { userId: user.id },
        data: {
          withdrawnProfit: {
            increment: parsedAmount,
          },
        },
      });

      return { transaction, balance: updatedBalance };
    });

    return NextResponse.json({
      success: true,
      transaction: {
        id: result.transaction.id,
        type: result.transaction.type,
        token: result.transaction.token,
        amount: Number(result.transaction.amount),
        status: result.transaction.status,
        createdAt: result.transaction.createdAt,
      },
      balance: {
        totalDeposited: Number(result.balance.totalDeposited),
        totalWithdrawn: Number(result.balance.totalWithdrawn),
        accruedProfit: Number(result.balance.accruedProfit),
        withdrawnProfit: Number(result.balance.withdrawnProfit),
      },
    });
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
