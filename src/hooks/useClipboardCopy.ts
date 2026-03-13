import { useCallback, useState } from "react";

export function useClipboardCopy(resetDelay = 1500) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelay);
    },
    [resetDelay],
  );

  return { copied, copyToClipboard };
}
