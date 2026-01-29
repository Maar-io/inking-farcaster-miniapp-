import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { startaleConnector } from "@startale/app-sdk";
import { http, createConfig } from "wagmi";
import { soneium } from "wagmi/chains";

export const config = createConfig({
  chains: [soneium],
  // Use Farcaster connector for iframe embedding, and Startale for popup-based auth
  connectors: [farcasterMiniApp(), startaleConnector()],
  transports: {
    [soneium.id]: http()
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
