import { useEffect } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { soneium } from "wagmi/chains";
import { useMintCooldown } from "./hooks/useMintCooldown";
import { useNftBalance } from "./hooks/useNftBalance";

const NFT_CONTRACT = "0x7a181921b8976cE4a4997B134225d2E74E67797B" as const;
const NFT_ABI = [
  {
    inputs: [{ name: "to", type: "address" }],
    name: "mint",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

interface MintGalleryProps {
  address: `0x${string}`;
  storagePrefix: string;
  onMintSuccess?: () => void;
  emptySlotBg?: string;
  emptySlotBorder?: string;
}

export function MintGallery({
  address,
  storagePrefix,
  onMintSuccess,
  emptySlotBg = "rgba(0,0,0,0.1)",
  emptySlotBorder = "rgba(0,0,0,0.2)",
}: MintGalleryProps) {
  const { localCount, setLocalCount, tokenURI } = useNftBalance(address, storagePrefix);
  const { timeRemaining, setLastMintTime, canMint } = useMintCooldown(storagePrefix);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleMint = () => {
    writeContract({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: "mint",
      args: [address],
      chainId: soneium.id,
    });
  };

  // On successful mint: update count, save time, call callback
  useEffect(() => {
    if (isSuccess) {
      setLocalCount((prev) => {
        const next = prev + 1;
        localStorage.setItem(`${storagePrefix}-nft-count-${address}`, next.toString());
        return next;
      });
      const now = Date.now();
      setLastMintTime(now);
      localStorage.setItem(`${storagePrefix}-last-mint-time`, now.toString());
      onMintSuccess?.();
    }
  }, [isSuccess, address, storagePrefix, onMintSuccess, setLocalCount, setLastMintTime]);

  const totalNfts = localCount;
  const nftCount = totalNfts === 0 ? 0 : totalNfts % 10 || 10;
  const formatTime = (ms: number) => `${Math.ceil(ms / 1000)}s`;

  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <button type="button" onClick={handleMint} disabled={isPending || isConfirming || !canMint}>
          {isPending || isConfirming ? "Minting..." : !canMint ? `Wait ${formatTime(timeRemaining)}` : "Mint NFT"}
        </button>
        <span style={{ fontSize: "13px", fontWeight: "500" }}>{totalNfts} minted</span>
      </div>

      {isSuccess && <div style={{ fontSize: "12px", marginTop: "8px" }}>NFT minted successfully!</div>}

      {error && <div style={{ color: "red", fontSize: "12px", marginTop: "8px" }}>Error: {error.message}</div>}

      {/* NFT Grid - 10 placeholders, 5 per row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "8px",
          marginTop: "16px",
        }}
      >
        {Array.from({ length: 10 }, (_, i) => `nft-${i}`).map((nftKey, index) => (
          <div
            key={nftKey}
            style={{
              aspectRatio: "1",
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: index < nftCount ? "transparent" : emptySlotBg,
              border: `2px solid ${index < nftCount ? "transparent" : emptySlotBorder}`,
            }}
          >
            {index < nftCount && tokenURI && (
              <img
                src={tokenURI}
                alt={`NFT ${index + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
