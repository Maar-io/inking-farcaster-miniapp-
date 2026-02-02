import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect } from "react";
import { useConnection, useConnect, useConnectors, useSignMessage } from "wagmi";

function App() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <>
      <div>Mini App + Vite + TS + React + Wagmi</div>
      <ConnectMenu />
    </>
  );
}

function ConnectMenu() {
  const { address, status } = useConnection();
  const { mutate: connect, error: connectError } = useConnect();
  const connectors = useConnectors();
  
  useEffect(() => {
    console.log('Address:', address, 'Status:', status);
    console.log('Available connectors:', connectors.map(c => c.name));
  }, [address, status, connectors]);

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
