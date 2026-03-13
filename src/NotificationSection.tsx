import { useNotifications } from "./hooks/useNotifications";

interface NotificationSectionProps {
  appName: string;
  storageKey: string;
  accentColor: string;
}

export function NotificationSection({ appName, storageKey, accentColor }: NotificationSectionProps) {
  const { status, error, handleEnable, handleSend, handleDisable } = useNotifications({ appName, storageKey });

  return (
    <div>
      {status === "idle" || status === "error" ? (
        <button
          type="button"
          onClick={handleEnable}
          style={{
            padding: "8px 16px",
            backgroundColor: accentColor,
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Enable Notifications
        </button>
      ) : status === "enabling" ? (
        <button type="button" disabled style={{ padding: "8px 16px", fontSize: "14px" }}>
          Enabling...
        </button>
      ) : (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleSend}
            disabled={status === "sending"}
            style={{
              padding: "8px 16px",
              backgroundColor: status === "sent" ? "#16a34a" : accentColor,
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            {status === "sending" ? "Sending..." : status === "sent" ? "Sent!" : "Test Notification"}
          </button>
          <button
            type="button"
            onClick={handleDisable}
            style={{
              padding: "8px 16px",
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Disable
          </button>
        </div>
      )}
      {error && <div style={{ color: "red", fontSize: "12px", marginTop: "8px" }}>{error}</div>}
    </div>
  );
}
