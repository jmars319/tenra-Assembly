"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
    >
      {copied ? "Copied" : "Copy text"}
    </button>
  );
}
