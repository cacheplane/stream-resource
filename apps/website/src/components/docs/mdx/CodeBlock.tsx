import type { ReactNode } from 'react';
import { tokens } from '@ngaf/design-tokens';

interface Props {
  filename?: string;
  language?: string;
  children: ReactNode;
}

/**
 * MDX <pre> wrapper. Renders BrowserFrame-style chrome around
 * a code body. The body itself (typically a <pre> rendered by shiki)
 * keeps its own dark tokyo-night background.
 *
 * The fenced-code-block code (rendered by rehype-pretty-code) does
 * not use this wrapper; it goes through the .shiki rules in
 * global.css.
 */
export function Pre({ filename, language, children }: Props) {
  return (
    <div
      data-mdx="code-block"
      style={{
        background: tokens.surfaces.surface,
        border: `1px solid ${tokens.surfaces.border}`,
        borderRadius: tokens.radius.lg,
        overflow: 'hidden',
        margin: '20px 0',
        boxShadow: tokens.shadows.sm,
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          background: tokens.surfaces.surfaceTinted,
          borderBottom: `1px solid ${tokens.surfaces.border}`,
        }}
      >
        <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
          <span style={{ width: 10, height: 10, borderRadius: tokens.radius.full, background: '#FF5F57' }} />
          <span style={{ width: 10, height: 10, borderRadius: tokens.radius.full, background: '#FEBC2E' }} />
          <span style={{ width: 10, height: 10, borderRadius: tokens.radius.full, background: '#28C840' }} />
        </div>
        {filename ? (
          <div
            style={{
              flex: 1,
              fontFamily: tokens.typography.fontMono,
              fontSize: 11,
              color: tokens.colors.textMuted,
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {filename}
            {language ? <span style={{ marginLeft: 8, opacity: 0.6 }}>· {language}</span> : null}
          </div>
        ) : null}
        <div style={{ width: 42 }} aria-hidden="true" />
      </div>
      <div data-mdx="code-block-body">{children}</div>
    </div>
  );
}
