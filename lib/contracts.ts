import { type Abi, parseAbi } from "viem";
import { USDC_ADDRESS, USDT_ADDRESS } from "./constants";

// Standard ERC20 ABI (transfer only — what we need for deposits)
export const ERC20_ABI: Abi = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

// Get token contract address by symbol
export function getTokenAddress(token: "USDC" | "USDT"): `0x${string}` {
  return token === "USDC" ? USDC_ADDRESS : USDT_ADDRESS;
}

// Parse token amount to wei (USDC/USDT have 6 decimals, not 18)
export function parseTokenAmount(amount: string, decimals: number = 6): bigint {
  // Split on decimal point
  const parts = amount.split(".");
  const integer = parts[0] || "0";
  let fractional = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals);

  return BigInt(integer + fractional);
}

// Format token amount from wei
export function formatTokenAmount(
  amount: bigint,
  decimals: number = 6
): string {
  const str = amount.toString().padStart(decimals + 1, "0");
  const intPart = str.slice(0, str.length - decimals) || "0";
  const fracPart = str.slice(str.length - decimals).replace(/0+$/, "");
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}
