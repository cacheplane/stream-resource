import Link from 'next/link';

export function Footer() {
  return (
    <footer className="px-8 py-12 mt-24"
      style={{ borderTop: '1px solid var(--color-accent-border)' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start justify-between gap-8">
        <div>
          <p className="font-garamond text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>StreamResource</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>The Enterprise Streaming Resource for LangChain and Angular</p>
        </div>
        <div className="flex gap-12 text-sm">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase" style={{ color: 'var(--color-accent)' }}>Product</span>
            <Link href="/docs" className="transition-colors" style={{ color: 'var(--color-text-secondary)' }}>Docs</Link>
            <Link href="/api-reference" className="transition-colors" style={{ color: 'var(--color-text-secondary)' }}>API Reference</Link>
            <Link href="/pricing" className="transition-colors" style={{ color: 'var(--color-text-secondary)' }}>Pricing</Link>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-8 pt-8 flex items-center justify-between text-xs"
        style={{ borderTop: '1px solid var(--color-accent-border)', color: 'var(--color-text-muted)' }}>
        <span>© {new Date().getFullYear()} StreamResource. All rights reserved.</span>
        <span>PolyForm Noncommercial 1.0.0 · <Link href="/pricing" className="transition-colors">Commercial License</Link></span>
      </div>
    </footer>
  );
}
