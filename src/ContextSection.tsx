import type React from "react";

interface ContextSectionProps {
  starPoints: number | null;
  eoaWallets: string[];
  username?: string;
  pfpUrl?: string;
}

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "rgba(255,255,255,0.5)",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  padding: "8px 12px 8px 0",
  verticalAlign: "middle",
};

const valueStyle: React.CSSProperties = {
  fontSize: "13px",
  padding: "8px 0",
  textAlign: "right",
  verticalAlign: "middle",
};

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function ContextSection({ starPoints, eoaWallets, username, pfpUrl }: ContextSectionProps) {
  const rows: { label: string; value: React.ReactNode }[] = [];

  if (username) {
    rows.push({ label: "Username", value: username });
  }

  if (pfpUrl) {
    rows.push({
      label: "Avatar",
      value: (
        <img
          src={pfpUrl}
          alt={username || "User"}
          style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
        />
      ),
    });
  }

  rows.push({
    label: "Star Points",
    value: starPoints !== null ? starPoints.toLocaleString() : "—",
  });

  if (eoaWallets.length > 0) {
    rows.push({
      label: `EOA Wallet${eoaWallets.length > 1 ? "s" : ""}`,
      value: (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {eoaWallets.map((wallet) => (
            <span key={wallet} style={{ fontFamily: "monospace", fontSize: "13px" }}>
              {truncateAddress(wallet)}
            </span>
          ))}
        </div>
      ),
    });
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.08)",
        borderRadius: "12px",
        padding: "14px 16px",
        fontSize: "14px",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map((row, i) => (
            <>
              {i > 0 && (
                <tr key={`sep-${row.label}`}>
                  <td colSpan={2} style={{ padding: 0 }}>
                    <div style={{ height: "1px", background: "rgba(255,255,255,0.1)" }} />
                  </td>
                </tr>
              )}
              <tr key={row.label}>
                <td style={labelStyle}>{row.label}</td>
                <td style={valueStyle}>{row.value}</td>
              </tr>
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
