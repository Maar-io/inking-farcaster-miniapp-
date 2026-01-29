import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useState } from "react";
import { useConnection, useConnect, useConnectors, useSignMessage } from "wagmi";

function App() {
  const [isInIframe, setIsInIframe] = useState(false);
  const [parentWalletAddress, setParentWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    // Check if running in iframe
    setIsInIframe(window.self !== window.top);
    
    // Get wallet address from URL params (passed by parent app)
    const params = new URLSearchParams(window.location.search);
    const walletAddress = params.get('walletAddress');
    if (walletAddress) {
      setParentWalletAddress(walletAddress);
    }
    
    // Notify Farcaster that the app is ready
    sdk.actions.ready();
  }, []);

  return (
    <>
      <div>Mini App + Vite + TS + React + Wagmi</div>
      {isInIframe && <div style={{ fontSize: '12px', color: '#666' }}>Running in iframe</div>}
      {parentWalletAddress && (
        <div style={{ fontSize: '12px', color: '#0066cc', margin: '5px 0', padding: '5px', backgroundColor: '#e6f2ff' }}>
          Parent wallet: {parentWalletAddress.slice(0, 6)}...{parentWalletAddress.slice(-4)}
        </div>
      )}
      <ConnectMenu />
    </>
  );
}

function ConnectMenu() {
  const { address, status } = useConnection();
  const { mutate: connect, error: connectError } = useConnect();
  const connectors = useConnectors();
  const isInIframe = window.self !== window.top;
  
  useEffect(() => {
    console.log('Address:', address, 'Status:', status);
    console.log('Available connectors:', connectors.map(c => c.name));
    console.log('Is in iframe:', isInIframe);
  }, [address, status, connectors, isInIframe]);

  if (status === "connected") {
    return (
      <>
        <div>Connected account:</div>
        <div>{address}</div>
        <SignButton />
      </>
    );
  }

  return (
    <>
      <div>Status: {status}</div>
      <div>Connectors: {connectors.length}</div>
      
      {/* Show all available connectors */}
      <div style={{ marginTop: '10px' }}>
        {connectors.map((connector) => (
          <button 
            key={connector.uid}
            type="button" 
            onClick={() => {
              console.log('Attempting to connect with:', connector.name);
              connect({ connector });
            }}
            disabled={status === "connecting"}
            style={{ display: 'block', margin: '5px 0' }}
          >
            Connect {connector.name}
          </button>
        ))}
      </div>
      
      {connectError && (
        <div style={{ color: 'red', marginTop: '10px', fontSize: '12px' }}>
          Error: {connectError.message}
        </div>
      )}
      
      {isInIframe && connectors.some(c => c.name === 'Startale App') && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff3cd', fontSize: '12px' }}>
          Note: Startale App connector requires popup-based auth. Use Farcaster or MetaMask instead when embedded in iframe.
        </div>
      )}
    </>
  );
}

function SignButton() {
  const { mutate: signMessage, isPending, data, error } = useSignMessage();

  return (
    <>
      <button type="button" onClick={() => signMessage({ message: "hello world" })} disabled={isPending}>
        {isPending ? "Signing..." : "Sign message"}
      </button>
      {data && (
        <>
          <div>Signature</div>
          <div>{data}</div>
        </>
      )}
      {error && (
        <>
          <div>Error</div>
          <div>{error.message}</div>
        </>
      )}
    </>
  );
}

export default App;
