import { useReadContract } from "wagmi";

const erc20BalanceOfAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const USDC_ADDRESS = "0x3f99231dD03a9F0E7e3421c92B7b90fbe012985a";
const USDC_DECIMALS = 6;

export function useUsdcBalance(account: `0x${string}` | undefined) {
  const { data: raw, ...rest } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20BalanceOfAbi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { enabled: !!account },
  });

  const formatted = raw !== undefined ? (Number(raw) / 10 ** USDC_DECIMALS).toFixed(2) : undefined;

  return { raw, formatted, ...rest };
}
