import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useState } from "react";

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function useSafeAreaInsets(): SafeAreaInsets {
  const [safeArea, setSafeArea] = useState<SafeAreaInsets>({ top: 0, bottom: 0, left: 0, right: 0 });

  useEffect(() => {
    sdk.actions.ready();
    sdk.back.enableWebNavigation().catch(() => {});

    (async () => {
      try {
        const context = (await sdk.context) as {
          client?: { safeAreaInsets?: SafeAreaInsets };
        };
        if (context?.client?.safeAreaInsets) {
          setSafeArea(context.client.safeAreaInsets);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return safeArea;
}
