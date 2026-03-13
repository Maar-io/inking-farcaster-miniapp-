interface ContextSectionProps {
  starPoints: number | null;
  eoaWallets: string[];
  username?: string;
  pfpUrl?: string;
}

export function ContextSection({ starPoints, eoaWallets, username, pfpUrl }: ContextSectionProps) {
  return (
    <div style={{ fontSize: "14px" }}>
      {/* User info with pfp */}
      {(username || pfpUrl) && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          {pfpUrl && (
            <img
              src={pfpUrl}
              alt={username || "User"}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          )}
          {username && <span style={{ fontWeight: "500" }}>{username}</span>}
        </div>
      )}

      {/* Star points */}
      {starPoints !== null && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>⭐</span>
          <span>
            {username || "User"} has <strong>{starPoints}</strong> STAR points
          </span>
        </div>
      )}
      {starPoints === null && (
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>No star data available</div>
      )}

      {/* EOA Wallets */}
      {eoaWallets.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          <div style={{ marginBottom: "4px", fontWeight: "500" }}>EOA Wallets ({eoaWallets.length})</div>
          {eoaWallets.map((wallet) => (
            <div
              key={wallet}
              style={{
                wordBreak: "break-all",
                fontSize: "11px",
                fontFamily: "monospace",
                lineHeight: "1.4",
                marginBottom: "2px",
              }}
            >
              {wallet}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
