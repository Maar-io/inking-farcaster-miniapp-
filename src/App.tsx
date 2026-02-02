import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect } from "react";
import { useConnection, useConnect, useConnectors, useSignMessage } from "wagmi";

function App() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <div style={{ padding: '16px', maxWidth: '100%' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '20px' }}>INKING Mini App</h1>
      <ConnectMenu />
    </div>
  );
}

function ConnectMenu() {
  const { address, status, chain } = useConnection();
  const { mutate: connect, error: connectError } = useConnect();
  const connectors = useConnectors();
  
  useEffect(() => {
    console.log('Address:', address, 'Status:', status);
    console.log('Available connectors:', connectors.map(c => c.name));
    console.log('Chain:', chain?.name);
  }, [address, status, connectors]);

  if (status === "connected") {
    return (
      <div style={{ fontSize: '14px' }}>
        <div style={{ marginBottom: '8px', fontWeight: '500' }}>Connected account:</div>
        <div style={{ wordBreak: 'break-all', marginBottom: '12px', fontSize: '11px' }}>{address}</div>
        <div style={{ marginBottom: '12px' }}>Chain: {chain?.name}</div>
        <SignButton />
      </div>
    );
  }

  return (
    <div style={{ fontSize: '14px' }}>
      <div style={{ marginBottom: '8px' }}>Status: {status}</div>
      <div style={{ marginBottom: '8px' }}>Chain: {chain?.name}</div>
      <div style={{ marginBottom: '12px' }}>Connectors: {connectors.length}</div>
      
      {/* Show all available connectors */}
      <div>
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

export default App;
