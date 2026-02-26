import { sdk } from "@farcaster/miniapp-sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConnection, useConnect, useConnectors, useDisconnect, useSignMessage } from "wagmi";
import { MintGallery } from "./MintGallery";
import { NotificationSection } from "./NotificationSection";
import { ContextSection } from "./ContextSection";

function SectionDivider({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0 12px' }}>
      <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
      <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.5)' }}>
        {title}
      </span>
      <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
    </div>
  );
}

function App() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <div style={{ padding: '16px', maxWidth: '100%' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '20px' }}>Demo Mini App</h1>
      <ConnectMenu />
    </div>
  );
}

function ConnectMenu() {
  const { address, status, chain } = useConnection();
  const { mutate: connect, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();
  const [starPoints, setStarPoints] = useState<number | null>(null);
  const [username, setUsername] = useState<string>('');
  const [pfpUrl, setPfpUrl] = useState<string>('');

  // Get the Startale connector
  const startaleConnector = connectors.find(c => c.name.toLowerCase() === 'startale');

  useEffect(() => {
    console.log('Address:', address, 'Status:', status);
    console.log('Startale connector:', startaleConnector?.name);
    console.log('Chain:', chain?.name);
  }, [address, status, startaleConnector, chain]);

  // Read context from sdk (async because of Comlink).
  // Wait for startaleConnector to be defined — it becomes available only after
  // the sandbox calls expose(), so using it as a dep avoids the race condition
  // where sdk.context GET messages are sent before the host is listening.
  useEffect(() => {
    if (!startaleConnector) return;
    (async () => {
      try {
        console.log('[inking] calling await sdk.context...');
        const context = await sdk.context as {
          startale?: { starPoints?: number };
          user?: { username?: string; pfpUrl?: string };
        };
        console.log('[inking] sdk.context resolved:', JSON.stringify(context));
        if (context?.startale?.starPoints !== undefined) {
          setStarPoints(context.startale.starPoints);
        }
        if (context?.user?.username) {
          setUsername(context.user.username);
        }
        if (context?.user?.pfpUrl) {
          setPfpUrl(context.user.pfpUrl);
        }
      } catch (e) {
        console.error('[inking] Failed to read context:', e);
      }
    })();
  }, [startaleConnector]);

  if (status === "connected") {
    return (
      <div style={{ fontSize: '14px' }}>
        <button
          type="button"
          onClick={() => disconnect()}
          style={{
            marginBottom: '4px',
            padding: '8px 16px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Disconnect Wallet
        </button>

        <SectionDivider title="Wallet Info" />
        <div style={{ marginBottom: '8px', fontWeight: '500' }}>Connected smart account:</div>
        <div style={{ wordBreak: 'break-all', marginBottom: '12px', fontSize: '11px' }}>{address}</div>
        <div style={{ marginBottom: '4px' }}>Chain: {chain?.name}</div>

        <SectionDivider title="Context" />
        <ContextSection starPoints={starPoints} username={username} pfpUrl={pfpUrl} />

        <SectionDivider title="Minting" />
        {address && <MintGalleryWithNotifications address={address} />}

        <SectionDivider title="Notifications" />
        <NotificationSection
          appName="Inking"
          storageKey="inking-notification-details"
          accentColor="#7c3aed"
        />

        <SectionDivider title="Message Signing" />
        <SignButton />
      </div>
    );
  }

  return (
    <div style={{ fontSize: '14px' }}>
      <div style={{ marginBottom: '8px' }}>Status: {status}</div>
      <div style={{ marginBottom: '8px' }}>Chain: {chain?.name}</div>

      {/* Use only Startale connector */}
      {startaleConnector ? (
        <button
          type="button"
          onClick={() => {
            console.log('Connecting with Startale connector');
            connect({ connector: startaleConnector });
          }}
          disabled={status === "connecting"}
          style={{
            padding: '12px 24px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '12px'
          }}
        >
          {status === "connecting" ? "Connecting..." : "Connect with Startale"}
        </button>
      ) : (
        <div style={{ color: 'orange', fontSize: '12px', marginBottom: '12px' }}>
          Startale connector not found
        </div>
      )}

      {connectError && (
        <div style={{ color: 'red', marginTop: '10px', fontSize: '12px' }}>
          Error: {connectError.message}
        </div>
      )}
    </div>
  );
}

function MintGalleryWithNotifications({ address }: { address: `0x${string}` }) {
  const notificationSentRef = useRef(false);

  const handleMintSuccess = useCallback(() => {
    // Reset so cooldown notification fires again after this mint
    notificationSentRef.current = false;

    // Read latest notification token from localStorage
    let details: { url: string; token: string } | null = null;
    try {
      const saved = localStorage.getItem('inking-notification-details');
      if (saved) {
        details = JSON.parse(saved) as { url: string; token: string };
      }
    } catch { /* ignore */ }

    if (details) {
      // Send "cooldown ready" notification after 60s
      const d = details;
      setTimeout(() => {
        if (notificationSentRef.current) return;
        notificationSentRef.current = true;
        fetch(d.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationId: `inking-ready-${Date.now()}`,
            title: 'Inking',
            body: 'You can mint NFT again!',
            targetUrl: window.location.href,
            tokens: [d.token],
          }),
        }).catch((e) => {
          console.error('[INKING] Failed to send cooldown notification:', e instanceof Error ? e.message : String(e));
        });
      }, 60000);
    }
  }, []);

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
        <div style={{ marginTop: '12px' }}>
          <div style={{ marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Signature</div>
          <div style={{ wordBreak: 'break-all', fontSize: '11px', fontFamily: 'monospace', lineHeight: '1.4' }}>{data}</div>
        </div>
      )}
      {error && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Error</div>
          <div style={{ color: 'red', fontSize: '12px' }}>{error.message}</div>
        </div>
      )}
    </div>
  );
}

export default App;
