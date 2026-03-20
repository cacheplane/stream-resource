'use client';
import { useState } from 'react';

interface Props {
  prompt: string;
  variant?: 'hero' | 'docs';
}

export function CopyPromptButton({ prompt, variant = 'docs' }: Props) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied — silently ignore
    }
  };

  const isHero = variant === 'hero';

  return (
    <button
      onClick={handleClick}
      aria-label={copied ? 'Prompt copied' : 'Copy prompt'}
      style={{
        background: isHero ? '#6C8EFF' : 'transparent',
        border: isHero ? 'none' : '1px solid rgba(108,142,255,0.4)',
        color: isHero ? '#fff' : '#6C8EFF',
        fontFamily: 'var(--font-mono)',
        fontSize: isHero ? '13px' : '12px',
        padding: isHero ? '12px 24px' : '8px 16px',
        borderRadius: isHero ? '8px' : '6px',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = isHero
          ? '0 0 16px rgba(108,142,255,0.4)'
          : '0 0 10px rgba(108,142,255,0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}>
      <span aria-hidden="true">{copied ? '✓' : '⚡'}</span>{' '}
      {copied ? 'Copied!' : 'Copy prompt'}
    </button>
  );
}
