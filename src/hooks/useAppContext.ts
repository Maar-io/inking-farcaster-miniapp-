import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useState } from "react";

interface AppContext {
  starPoints: number | null;
  eoaWallets: string[];
  username: string;
  pfpUrl: string;
  notificationsSupported: boolean;
}

export function useAppContext(storageKey: string): AppContext {
  const [starPoints, setStarPoints] = useState<number | null>(null);
  const [eoaWallets, setEoaWallets] = useState<string[]>([]);
  const [username, setUsername] = useState<string>("");
  const [pfpUrl, setPfpUrl] = useState<string>("");
  const [notificationsSupported, setNotificationsSupported] = useState(false);

  // Read context from sdk (async because of Comlink)
  useEffect(() => {
    (async () => {
      try {
        const context = (await sdk.context) as {
          startale?: { starPoints?: number; eoaWallets?: string[] };
          user?: { username?: string; pfpUrl?: string };
          client?: { notificationDetails?: { url: string; token: string } };
        };
        if (context?.startale?.starPoints !== undefined) {
          setStarPoints(context.startale.starPoints);
        }
        if (context?.startale?.eoaWallets) {
          setEoaWallets(context.startale.eoaWallets);
        }
        if (context?.user?.username) {
          setUsername(context.user.username);
        }
        if (context?.user?.pfpUrl) {
          setPfpUrl(context.user.pfpUrl);
        }
        // Seed localStorage and flag notifications as supported if host provides details
        if (context?.client?.notificationDetails?.url) {
          setNotificationsSupported(true);
          localStorage.setItem(storageKey, JSON.stringify(context.client.notificationDetails));
        }
      } catch (e) {
        console.error("[Inking] Failed to read context:", e);
      }
    })();
  }, [storageKey]);

  // Listen for notification events from hosts that support them (e.g. sandbox)
  useEffect(() => {
    const handleAdded = ({ notificationDetails }: { notificationDetails?: { url: string; token: string } }) => {
      if (notificationDetails?.url) {
        setNotificationsSupported(true);
        localStorage.setItem(storageKey, JSON.stringify(notificationDetails));
      }
    };
    const handleEnabled = ({ notificationDetails }: { notificationDetails: { url: string; token: string } }) => {
      setNotificationsSupported(true);
      localStorage.setItem(storageKey, JSON.stringify(notificationDetails));
    };
    const handleDisabled = () => {
      setNotificationsSupported(false);
      localStorage.removeItem(storageKey);
    };

    sdk.on("miniAppAdded", handleAdded);
    sdk.on("notificationsEnabled", handleEnabled);
    sdk.on("notificationsDisabled", handleDisabled);
    return () => {
      sdk.off("miniAppAdded", handleAdded);
      sdk.off("notificationsEnabled", handleEnabled);
      sdk.off("notificationsDisabled", handleDisabled);
    };
  }, [storageKey]);

  return { starPoints, eoaWallets, username, pfpUrl, notificationsSupported };
}
