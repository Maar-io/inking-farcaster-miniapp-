import { useEffect } from "react";
import { useBalance, useConnect, useConnection, useConnectors, useDisconnect, useSignMessage } from "wagmi";
import { ContextSection } from "./ContextSection";
import { MintGallery } from "./MintGallery";
import { NotificationSection } from "./NotificationSection";
import { useAppContext } from "./hooks/useAppContext";
import { useClipboardCopy } from "./hooks/useClipboardCopy";
import { useMintSuccessNotification } from "./hooks/useMintSuccessNotification";
import { useSafeAreaInsets } from "./hooks/useSafeAreaInsets";
import { useUsdcBalance } from "./hooks/useTokenBalance";

function SectionDivider({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "20px 0 12px" }}>
      <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.2)" }} />
      <span
        style={{
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {title}
      </span>
      <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.2)" }} />
    </div>
  );
}

function App() {
  const safeArea = useSafeAreaInsets();

  return (
    <div
      style={{
        padding: "16px",
        maxWidth: "100%",
        marginTop: safeArea.top,
        marginBottom: safeArea.bottom,
        marginLeft: safeArea.left,
        marginRight: safeArea.right,
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "24px", fontSize: "20px" }}>Demo Mini App</h1>
      <ConnectMenu />
    </div>
  );
}

function ConnectMenu() {
  const { address, status, chain } = useConnection();
  const { mutate: connect, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();
  const { data: balance } = useBalance({ address });
  const { formatted: usdcFormatted } = useUsdcBalance(address);
  const { starPoints, eoaWallets, username, pfpUrl, notificationsSupported } =
    useAppContext("inking-notification-details");
  const { copied, copyToClipboard } = useClipboardCopy();

  useEffect(() => {
    console.log("[Inking] Address:", address, "Status:", status);
    console.log("[Inking] Connectors:", connectors.map((c) => c.name).join(", "));
    console.log("[Inking] Chain:", chain?.name);
  }, [address, status, connectors, chain]);

  if (status === "connected") {
    return (
      <div style={{ fontSize: "14px" }}>
        <button
          type="button"
          onClick={() => disconnect()}
          style={{
            marginBottom: "4px",
            padding: "8px 16px",
            backgroundColor: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Disconnect Wallet
        </button>

        <SectionDivider title="Wallet Info" />
        <div
          style={{
            background: "rgba(255,255,255,0.08)",
            borderRadius: "12px",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
              Smart Account
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontFamily: "monospace", fontSize: "13px" }}>
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "—"}
              </span>
              {address && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(address)}
                  aria-label={copied ? "Copied" : "Copy address"}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    opacity: copied ? 1 : 0.5,
                    flexShrink: 0,
                    color: copied ? "#4ade80" : "currentColor",
                    transition: "color 0.2s, opacity 0.2s",
                    display: "flex",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <title>{copied ? "Copied" : "Copy address"}</title>
                    {copied ? (
                      <path d="M20 6L9 17l-5-5" />
                    ) : (
                      <>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </>
                    )}
                  </svg>
                </button>
              )}
            </span>
          </div>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.1)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Chain</span>
            <span style={{ fontSize: "13px" }}>{chain?.name ?? "—"}</span>
          </div>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.1)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>ETH</span>
            <span style={{ fontSize: "13px", fontFamily: "monospace" }}>
              {balance ? `${(Number(balance.value) / 10 ** balance.decimals).toFixed(4)}` : "—"}
            </span>
          </div>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.1)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>USDC</span>
            <span style={{ fontSize: "13px", fontFamily: "monospace" }}>
              {usdcFormatted !== undefined ? usdcFormatted : "—"}
            </span>
          </div>
        </div>

        <SectionDivider title="Context" />
        <ContextSection starPoints={starPoints} eoaWallets={eoaWallets} username={username} pfpUrl={pfpUrl} />

        <SectionDivider title="Minting" />
        {address && <MintGalleryWithNotifications address={address} />}

        {notificationsSupported && (
          <>
            <SectionDivider title="Notifications" />
            <NotificationSection appName="Inking" storageKey="inking-notification-details" accentColor="#7c3aed" />
          </>
        )}

        <SectionDivider title="Message Signing" />
        <SignButton />
      </div>
    );
  }

  return (
    <div style={{ fontSize: "14px" }}>
      <div style={{ marginBottom: "8px" }}>Status: {status}</div>
      <div style={{ marginBottom: "8px" }}>Chain: {chain?.name}</div>

      {connectors.map((connector) => (
        <button
          key={connector.uid}
          type="button"
          onClick={() => {
            console.log("[Inking] Connecting with", connector.name);
            connect({ connector });
          }}
          disabled={status === "connecting"}
          style={{
            padding: "12px 24px",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            marginBottom: "8px",
            display: "block",
            width: "100%",
          }}
        >
          {status === "connecting" ? "Connecting..." : `Connect with ${connector.name}`}
        </button>
      ))}

      {connectError && (
        <div style={{ color: "red", marginTop: "10px", fontSize: "12px" }}>Error: {connectError.message}</div>
      )}
    </div>
  );
}

function MintGalleryWithNotifications({ address }: { address: `0x${string}` }) {
  const handleMintSuccess = useMintSuccessNotification("inking-notification-details");

  return (
    <MintGallery
      address={address}
      storagePrefix="inking"
      onMintSuccess={handleMintSuccess}
      emptySlotBg="#333"
      emptySlotBorder="#555"
    />
  );
}

function SignButton() {
  const { mutate: signMessage, isPending, data, error } = useSignMessage();

  return (
    <div>
      <button type="button" onClick={() => signMessage({ message: "hello world" })} disabled={isPending}>
        {isPending ? "Signing..." : "Sign message"}
      </button>
      {data && (
        <div style={{ marginTop: "12px" }}>
          <div style={{ marginBottom: "8px", fontWeight: "500", fontSize: "14px" }}>Signature</div>
          <div style={{ wordBreak: "break-all", fontSize: "11px", fontFamily: "monospace", lineHeight: "1.4" }}>
            {data}
          </div>
        </div>
      )}
      {error && (
        <div style={{ marginTop: "12px" }}>
          <div style={{ marginBottom: "8px", fontWeight: "500", fontSize: "14px" }}>Error</div>
          <div style={{ color: "red", fontSize: "12px" }}>{error.message}</div>
        </div>
      )}
    </div>
  );
}

export default App;
