import { useCallback, useEffect, useRef } from "react";

export function useMintSuccessNotification(storageKey: string) {
  const notificationSentRef = useRef(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const handleMintSuccess = useCallback(() => {
    // Reset so cooldown notification fires again after this mint
    notificationSentRef.current = false;

    // Read latest notification token from localStorage
    let details: { url: string; token: string } | null = null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        details = JSON.parse(saved) as { url: string; token: string };
      }
    } catch {
      /* ignore */
    }

    if (details) {
      // Send "cooldown ready" notification after 60s
      const d = details;
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
      cooldownTimerRef.current = setTimeout(() => {
        if (notificationSentRef.current) return;
        notificationSentRef.current = true;
        fetch(d.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notificationId: `inking-ready-${Date.now()}`,
            title: "Inking",
            body: "You can mint NFT again!",
            targetUrl: window.location.href,
            tokens: [d.token],
          }),
        }).catch((e) => {
          console.error("[Inking] Failed to send cooldown notification:", e instanceof Error ? e.message : String(e));
        });
      }, 60000);
    }
  }, [storageKey]);

  return handleMintSuccess;
}
