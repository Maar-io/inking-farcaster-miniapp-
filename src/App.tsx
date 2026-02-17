import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect } from "react";
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
  
  // Get the Startale connector
  const startaleConnector = connectors.find(c => c.name.toLowerCase() === 'startale');
  
  useEffect(() => {
    console.log('Address:', address, 'Status:', status);
    console.log('Startale connector:', startaleConnector?.name);
    console.log('Chain:', chain?.name);
  }, [address, status, startaleConnector]);

  if (status === "connected") {
    return (
      <div style={{ fontSize: '14px' }}>
        <div style={{ marginBottom: '8px', fontWeight: '500' }}>Connected account:</div>
        <div style={{ wordBreak: 'break-all', marginBottom: '12px', fontSize: '11px' }}>{address}</div>
        <div style={{ marginBottom: '12px' }}>Chain: {chain?.name}</div>
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
        <MintSection address={address!} />
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

  const hasMinted = balance !== undefined && balance >= 1n;

  const handleMint = () => {
    writeContract({
      address: NFT_CONTRACT,
      abi: NFT_ABI,
      functionName: "mint",
      args: [address],
      chainId: soneium.id,
    });
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <button
        type="button"
        onClick={handleMint}
        disabled={isPending || isConfirming || hasMinted}
        style={{ marginBottom: '8px' }}
      >
        {isPending || isConfirming ? "Minting..." : hasMinted ? "Already Minted" : "Mint NFT"}
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

      {hasMinted && tokenURI && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
          <img 
            src={tokenURI} 
            alt="NFT" 
            style={{ width: '300px', height: '300px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)' }}
          />
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
