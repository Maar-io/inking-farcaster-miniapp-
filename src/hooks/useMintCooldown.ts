import { useEffect, useState } from "react";

const COOLDOWN_MS = 60000;

export function useMintCooldown(storagePrefix: string) {
  const [lastMintTime, setLastMintTime] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(`${storagePrefix}-last-mint-time`);
      return saved ? Number.parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Cooldown timer
  useEffect(() => {
    if (!lastMintTime) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, COOLDOWN_MS - (Date.now() - lastMintTime));
      setTimeRemaining(remaining);
    }, 100);
    return () => clearInterval(interval);
  }, [lastMintTime]);

  const canMint = timeRemaining === 0;

  return { lastMintTime, setLastMintTime, timeRemaining, canMint };
}
