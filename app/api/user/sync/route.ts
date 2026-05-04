import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyId, walletAddress, email } = body as {
      privyId: string;
      walletAddress?: string;
      email?: string;
    };

    if (!privyId) {
      return NextResponse.json(
        { error: "privyId is required" },
        { status: 400 }
      );
    }

    // Upsert user by privyId
    const user = await prisma.user.upsert({
      where: { privyId },
      update: {
        ...(walletAddress !== undefined && { walletAddress }),
        ...(email !== undefined && { email }),
      },
      create: {
        privyId,
        ...(walletAddress && { walletAddress }),
        ...(email && { email }),
        balance: {
          create: {
            totalDeposited: 0,
            totalWithdrawn: 0,
            accruedProfit: 0,
            withdrawnProfit: 0,
          },
        },
      },
      include: {
        balance: true,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        privyId: user.privyId,
        walletAddress: user.walletAddress,
        email: user.email,
        createdAt: user.createdAt,
      },
      balance: user.balance
        ? {
            totalDeposited: Number(user.balance.totalDeposited),
            totalWithdrawn: Number(user.balance.totalWithdrawn),
            accruedProfit: Number(user.balance.accruedProfit),
            withdrawnProfit: Number(user.balance.withdrawnProfit),
          }
        : null,
    });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
