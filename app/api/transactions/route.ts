import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const privyId = searchParams.get("privyId");
    const type = searchParams.get("type");
    const token = searchParams.get("token");
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );

    if (!privyId) {
      return NextResponse.json(
        { error: "privyId query parameter is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { privyId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Build dynamic where clause
    const where: Prisma.TransactionWhereInput = {
      userId: user.id,
    };

    if (type && ["DEPOSIT", "WITHDRAWAL", "ACCRUAL"].includes(type)) {
      where.type = type;
    }

    if (token && ["USDC", "USDT"].includes(token)) {
      where.token = token;
    }

    if (
      status &&
      ["PENDING", "CONFIRMED", "FAILED", "PROCESSING", "COMPLETED"].includes(status)
    ) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        token: tx.token,
        amount: Number(tx.amount),
        txHash: tx.txHash,
        status: tx.status,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      })),
      total,
      page,
      totalPages,
      limit,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
