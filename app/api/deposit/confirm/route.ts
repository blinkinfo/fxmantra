import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, decodeFunctionData, parseAbi } from "viem";
import { base } from "viem/chains";
import { prisma } from "@/lib/prisma";
import { TOKEN_CONFIG } from "@/lib/constants";
import { ERC20_ABI } from "@/lib/contracts";

const ERC20_TRANSFER_ABI = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
]);

function getRpcUrl(): string {
  return process.env.RPC_URL || "https://mainnet.base.org";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txHash, token, amount, fromAddress, privyId } = body as {
      txHash: string;
      token: "USDC" | "USDT";
      amount: string;
      fromAddress: string;
      privyId: string;
    };

    if (!txHash || !token || !amount || !fromAddress || !privyId) {
      return NextResponse.json(
        { error: "Missing required fields: txHash, token, amount, fromAddress, privyId" },
        { status: 400 }
      );
    }

    if (token !== "USDC" && token !== "USDT") {
      return NextResponse.json(
        { error: "Invalid token. Must be USDC or USDT" },
        { status: 400 }
      );
    }

    // Check for duplicate txHash to prevent double-counting
    const existingTx = await prisma.transaction.findFirst({
      where: { txHash },
    });

    if (existingTx) {
      return NextResponse.json(
        { error: "Transaction already processed" },
        { status: 409 }
      );
    }

    const appWalletAddress = process.env.NEXT_PUBLIC_APP_WALLET_ADDRESS;
    if (!appWalletAddress) {
      console.error("NEXT_PUBLIC_APP_WALLET_ADDRESS is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const tokenConfig = TOKEN_CONFIG[token];
    const rpcUrl = getRpcUrl();

    // Create viem public client to verify transaction on Base
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    // Fetch the transaction receipt
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });

    if (!receipt || receipt.status !== "success") {
      return NextResponse.json(
        { error: "Transaction was not successful on-chain" },
        { status: 400 }
      );
    }

    // Fetch the full transaction to decode input data
    const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });

    if (!tx) {
      return NextResponse.json(
        { error: "Could not fetch transaction details" },
        { status: 400 }
      );
    }

    // Verify the transaction interacted with the correct token contract
    if (tx.to?.toLowerCase() !== tokenConfig.address.toLowerCase()) {
      return NextResponse.json(
        { error: `Transaction does not interact with the ${token} contract` },
        { status: 400 }
      );
    }

    // Verify the from address matches
    if (tx.from.toLowerCase() !== fromAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Transaction sender does not match provided address" },
        { status: 400 }
      );
    }

    // Decode the transfer function data
    let decoded: { functionName: string; args: readonly unknown[] };
    try {
      decoded = decodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        data: tx.input,
      });
    } catch {
      return NextResponse.json(
        { error: "Transaction is not a transfer call" },
        { status: 400 }
      );
    }

    if (decoded.functionName !== "transfer") {
      return NextResponse.json(
        { error: "Transaction is not a transfer call" },
        { status: 400 }
      );
    }

    const [recipient, transferredAmount] = decoded.args as [`0x${string}`, bigint];

    // Verify the recipient is the app wallet address
    if (recipient.toLowerCase() !== appWalletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Transfer recipient does not match the app wallet address" },
        { status: 400 }
      );
    }

    // Decode the transfer amount (USDC/USDT have 6 decimals)
    const expectedAmount = BigInt(Math.round(parseFloat(amount) * 10 ** tokenConfig.decimals));
    // Allow a small tolerance (1 unit in smallest denomination)
    const tolerance = BigInt(1);
    if (
      transferredAmount < expectedAmount - tolerance ||
      transferredAmount > expectedAmount + tolerance
    ) {
      return NextResponse.json(
        { error: "Transfer amount does not match the claimed amount" },
        { status: 400 }
      );
    }

    // All verifications passed — credit the user
    const result = await prisma.$transaction(async (tx) => {
      // Find user by fromAddress or privyId
      const user = await tx.user.findFirst({
        where: {
          OR: [
            { walletAddress: { equals: fromAddress, mode: "insensitive" } },
            { privyId },
          ],
        },
        include: { balance: true },
      });

      if (!user || !user.balance) {
        throw new Error("User or balance not found");
      }

      // Create deposit transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: "DEPOSIT",
          token,
          amount: parseFloat(amount),
          txHash,
          status: "CONFIRMED",
        },
      });

      // Update user balance
      const updatedBalance = await tx.balance.update({
        where: { userId: user.id },
        data: {
          totalDeposited: {
            increment: parseFloat(amount),
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
        txHash: result.transaction.txHash,
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
    console.error("Error confirming deposit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
