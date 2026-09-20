"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (insecure context); fall back to a prompt.
      window.prompt("Copy this link:", text);
    }
  }

  return (
    <button type="button" onClick={copy} className="btn btn-secondary">
      {copied ? "Copied" : label}
    </button>
  );
}
