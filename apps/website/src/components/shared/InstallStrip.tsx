'use client';
import { useState } from 'react';

const CMD = 'npm install @cacheplane/stream-resource';

export function InstallStrip() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inline-flex items-center gap-4 px-6 py-3 rounded-lg transition-all cursor-pointer"
      style={{ border: '1px solid var(--color-accent-border)', background: 'rgba(108,142,255,0.04)' }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 0 12px rgba(108,142,255,0.2)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
      onClick={copy}>
      <code className="font-mono text-sm" style={{ color: 'var(--color-text-secondary)' }}>{CMD}</code>
      <button className="font-mono text-xs uppercase shrink-0 transition-colors"
        style={{ color: copied ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
