import { sdk } from "@farcaster/miniapp-sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConnection, useConnect, useConnectors, useDisconnect, useSignMessage, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { soneium } from "wagmi/chains";

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

  // Get the Startale connector
  const startaleConnector = connectors.find(c => c.name.toLowerCase() === 'startale');

  useEffect(() => {
    console.log('Address:', address, 'Status:', status);
    console.log('Startale connector:', startaleConnector?.name);
    console.log('Chain:', chain?.name);
  }, [address, status, startaleConnector, chain]);

  // Read starPoints from context (async because of Comlink)
  useEffect(() => {
    (async () => {
      try {
        const context = await sdk.context as { starPoints?: number };
        if (context?.starPoints !== undefined) {
          setStarPoints(context.starPoints);
        }
      } catch (e) {
        console.error('Failed to read context:', e);
      }
    })();
  }, []);

  if (status === "connected") {
    return (
      <div style={{ fontSize: '14px' }}>
        <div style={{ marginBottom: '8px', fontWeight: '500' }}>Connected account:</div>
        <div style={{ wordBreak: 'break-all', marginBottom: '12px', fontSize: '11px' }}>{address}</div>
        <div style={{ marginBottom: '12px' }}>Chain: {chain?.name}</div>
        {starPoints !== null && (
          <div style={{ marginBottom: '12px', color: 'white' }}>
            ⭐ User star points: {starPoints}
          </div>
        )}
        <button
          type="button"
          onClick={() => disconnect()}
          style={{
            marginBottom: '16px',
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
        {address && <MintSection address={address} />}
        <SignButton />
        <NotifyButton />
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

const NFT_CONTRACT = "0x7a181921b8976cE4a4997B134225d2E74E67797B" as const;
const NFT_ABI = [
  {
    inputs: [{ name: "to", type: "address" }],
    name: "mint",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
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

function MintSection({ address }: { address: `0x${string}` }) {
  const { data: balance } = useReadContract({
    address: NFT_CONTRACT,
    abi: NFT_ABI,
    functionName: "balanceOf",
    args: [address],
    chainId: soneium.id,
  });

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

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [lastMintTime, setLastMintTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [notificationSent, setNotificationSent] = useState(false);
  const notifDetailsRef = useRef<{ url: string; token: string } | null>(null);

  // Load notification details and last mint time
  useEffect(() => {
    try {
      const saved = localStorage.getItem('inking-notification-details');
      if (saved) {
        notifDetailsRef.current = JSON.parse(saved) as { url: string; token: string };
      }
      const lastMint = localStorage.getItem('inking-last-mint-time');
      if (lastMint) {
        setLastMintTime(Number.parseInt(lastMint, 10));
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  }, []);

  // Timer for cooldown
  useEffect(() => {
    if (!lastMintTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastMintTime;
      const remaining = Math.max(0, 60000 - elapsed); // 1 minute = 60000ms

      setTimeRemaining(remaining);

      // Send notification when mint becomes available
      if (remaining === 0 && !notificationSent && notifDetailsRef.current) {
        const details = notifDetailsRef.current;
        fetch(details.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationId: `inking-ready-${Date.now()}`,
            title: 'Inking',
            body: 'You can mint NFT again!',
            targetUrl: window.location.href,
            tokens: [details.token],
          }),
        }).catch((e) => console.error('Failed to send notification:', e));
        setNotificationSent(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [lastMintTime, notificationSent]);

  // Reset notification sent flag when new mint is allowed
  useEffect(() => {
    if (timeRemaining === 0 && notificationSent) {
      // Reset flag when user mints again
    }
  }, [timeRemaining, notificationSent]);

  const canMint = timeRemaining === 0;

  const handleMint = () => {
    writeContract({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: "mint",
      args: [address],
      chainId: soneium.id,
    });
  };

  // Update last mint time on successful mint
  useEffect(() => {
    if (isSuccess) {
      const now = Date.now();
      setLastMintTime(now);
      localStorage.setItem('inking-last-mint-time', now.toString());
      setNotificationSent(false); // Reset for next cooldown
    }
  }, [isSuccess]);

  const nftCount = balance !== undefined ? Number(balance) : 0;
  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <button
        type="button"
        onClick={handleMint}
        disabled={isPending || isConfirming || !canMint}
        style={{ marginBottom: '8px' }}
      >
        {isPending || isConfirming ? "Minting..." : !canMint ? `Wait ${formatTime(timeRemaining)}` : "Mint NFT"}
      </button>

      {isSuccess && (
        <div style={{ color: 'white', fontSize: '12px', marginTop: '8px' }}>
          NFT minted successfully!
        </div>
      )}

      {error && (
        <div style={{ color: 'red', fontSize: '12px', marginTop: '8px' }}>
          Error: {error.message}
        </div>
      )}

      {/* NFT Grid - 10 placeholders, 5 per row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '8px',
        marginTop: '16px'
      }}>
        {Array.from({ length: 10 }, (_, i) => `nft-${i}`).map((nftKey, index) => (
          <div
            key={nftKey}
            style={{
              aspectRatio: '1',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: index < nftCount ? 'transparent' : '#333',
              border: '2px solid #555',
            }}
          >
            {index < nftCount && tokenURI && (
              <img
                src={tokenURI}
                alt={`NFT ${index + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
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

function NotifyButton() {
  const [status, setStatus] = useState<'idle' | 'enabling' | 'enabled' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const notifDetailsRef = useRef<{ url: string; token: string } | null>(null);

  // Load saved notification details from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('inking-notification-details');
      if (saved) {
        const details = JSON.parse(saved) as { url: string; token: string };
        notifDetailsRef.current = details;
        setStatus('enabled');
      }
    } catch (e) {
      console.error('Failed to load notification details:', e);
    }
  }, []);

  const handleEnable = useCallback(async () => {
    setStatus('enabling');
    setError(null);
    try {
      const result = await sdk.actions.addMiniApp();

      const details = (result as { notificationDetails?: { url: string; token: string } })?.notificationDetails;
      if (details) {
        notifDetailsRef.current = details;
        // Persist to localStorage
        localStorage.setItem('inking-notification-details', JSON.stringify(details));
        setStatus('enabled');
      } else {
        setError('No notification details returned');
        setStatus('error');
      }
    } catch (e) {
      console.error('[MINIAPP] Error in handleEnable:', e);
      setError(e instanceof Error ? e.message : 'Failed to enable notifications');
      setStatus('error');
    }
  }, []);

  const handleSend = useCallback(async () => {
    const details = notifDetailsRef.current;
    if (!details) return;
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch(details.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: `inking-${Date.now()}`,
          title: 'Inking',
          body: 'This is a test notification',
          targetUrl: window.location.href,
          tokens: [details.token],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('sent');
      setTimeout(() => setStatus('enabled'), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send notification');
      setStatus('error');
    }
  }, []);

  const handleDisable = useCallback(() => {
    // Clear local state
    notifDetailsRef.current = null;
    localStorage.removeItem('inking-notification-details');
    setStatus('idle');
    setError(null);
  }, []);

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Notifications</div>
      {status === 'idle' || status === 'error' ? (
        <button
          type="button"
          onClick={handleEnable}
          style={{
            padding: '8px 16px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Enable Notifications
        </button>
      ) : status === 'enabling' ? (
        <button type="button" disabled style={{ padding: '8px 16px', fontSize: '14px' }}>
          Enabling...
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleSend}
            disabled={status === 'sending'}
            style={{
              padding: '8px 16px',
              backgroundColor: status === 'sent' ? '#16a34a' : '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {status === 'sending' ? 'Sending...' : status === 'sent' ? 'Sent!' : 'Test Notification'}
          </button>
          <button
            type="button"
            onClick={handleDisable}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Disable
          </button>
        </div>
      )}
      {error && (
        <div style={{ color: 'red', fontSize: '12px', marginTop: '8px' }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default App;
