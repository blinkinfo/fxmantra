import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const privyId = searchParams.get("privyId");

    if (!privyId) {
      return NextResponse.json(
        { error: "privyId query parameter is required" },
        { status: 400 }
      );
    }

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

    const totalDeposited = Number(user.balance.totalDeposited);
    const totalWithdrawn = Number(user.balance.totalWithdrawn);
    const accruedProfit = Number(user.balance.accruedProfit);
    const withdrawnProfit = Number(user.balance.withdrawnProfit);

    const availableProfit = Math.max(0, accruedProfit - withdrawnProfit);
    const totalBalance = totalDeposited + accruedProfit - totalWithdrawn;

    return NextResponse.json({
      totalDeposited,
      totalWithdrawn,
      accruedProfit,
      withdrawnProfit,
      availableProfit,
      totalBalance,
    });
  } catch (error) {
    console.error("Error fetching balance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
