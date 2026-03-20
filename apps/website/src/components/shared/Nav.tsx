'use client';
import Link from 'next/link';

const links = [
  { label: 'Docs', href: '/docs' },
  { label: 'API', href: '/api-reference' },
  { label: 'Pricing', href: '/pricing' },
];

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5"
      style={{ borderBottom: '1px solid var(--color-accent-border)', background: 'rgba(8,11,20,0.85)', backdropFilter: 'blur(12px)' }}>
      <Link href="/" className="font-garamond text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        StreamResource
      </Link>
      <div className="flex items-center gap-8">
        {links.map((l) => (
          <Link key={l.href} href={l.href}
            className="text-sm font-mono transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}>
            {l.label}
          </Link>
        ))}
        <Link href="/pricing"
          className="px-4 py-2 text-sm font-mono rounded transition-all"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 0 16px rgba(108,142,255,0.4)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}>
          Get Started
        </Link>
      </div>
    </nav>
  );
}
