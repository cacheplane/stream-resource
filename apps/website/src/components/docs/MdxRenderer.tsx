import { MDXRemote } from 'next-mdx-remote/rsc';
import { CopyPromptButton } from './CopyPromptButton';

interface Props {
  source: string;
  prompt?: string;
}

export function MdxRenderer({ source, prompt }: Props) {
  return (
    <article className="prose prose-invert max-w-none py-8 px-8 flex-1"
      style={{
        '--tw-prose-body': 'var(--color-text-secondary)',
        '--tw-prose-headings': 'var(--color-text-primary)',
        '--tw-prose-code': 'var(--color-accent)',
      } as React.CSSProperties}>
      {prompt && (
        <div style={{ marginBottom: 24 }}>
          {/* Copy prompt button — rendered before MDX prose per agentic docs spec */}
          <CopyPromptButton prompt={prompt} variant="docs" />
        </div>
      )}
      <MDXRemote source={source} />
    </article>
  );
}
