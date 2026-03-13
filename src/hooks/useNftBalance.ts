import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { soneium } from "wagmi/chains";

const NFT_CONTRACT = "0x7a181921b8976cE4a4997B134225d2E74E67797B" as const;
const NFT_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function useNftBalance(address: `0x${string}`, storagePrefix: string) {
  const { data: balance } = useReadContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: "balanceOf",
    args: [address],
    chainId: soneium.id,
  });

  const [localCount, setLocalCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}-nft-count-${address}`);
      return saved ? Number.parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Sync: when on-chain balance loads, use the higher value
  useEffect(() => {
    if (balance !== undefined) {
      const onChain = Number(balance);
      setLocalCount((prev) => {
        const next = Math.max(prev, onChain);
        localStorage.setItem(`${storagePrefix}-nft-count-${address}`, next.toString());
        return next;
      });
    }
  }, [balance, address, storagePrefix]);

  const { data: tokenURI } = useReadContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: "tokenURI",
    args: [0n],
    chainId: soneium.id,
    query: {
      enabled: balance !== undefined && balance >= 1n,
    },
  });

  return { localCount, setLocalCount, tokenURI, balance };
}
