import Link from 'next/link';
import { getAllDocsMeta } from '../../lib/docs';

export function DocsSidebar({ activeSlug }: { activeSlug: string }) {
  const docs = getAllDocsMeta();
  return (
    <aside
      className="w-56 shrink-0 py-8"
      style={{
        borderRight: '1px solid rgba(108,142,255,0.15)',
        background: '#0A0D18',
        minHeight: 'calc(100vh - 4rem)',
        position: 'sticky',
        top: '4rem',
      }}>
      <p
        className="font-mono text-xs uppercase tracking-widest mb-6 px-4"
        style={{ color: '#4A527A' }}>
        Documentation
      </p>
      <nav className="flex flex-col">
        {docs.map((doc) => {
          const slug = doc.slug.join('/');
          const isActive = slug === activeSlug;
          return (
            <Link
              key={slug}
              href={`/docs/${slug}`}
              className="px-4 py-2 text-sm mx-2 rounded-md transition-all"
              style={{
                color: isActive ? '#6C8EFF' : '#8B96C8',
                background: isActive ? 'rgba(108,142,255,0.1)' : 'transparent',
              }}>
              {doc.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
