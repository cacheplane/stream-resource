import fs from 'fs';
import path from 'path';

// process.cwd() resolves to apps/website/ when Next.js runs in the Nx monorepo
const DOCS_DIR = path.join(process.cwd(), 'content', 'docs');
const PROMPTS_DIR = path.join(process.cwd(), 'content', 'prompts');

export interface DocMeta {
  slug: string[];
  title: string;
}

export function getAllDocSlugs(): string[][] {
  if (!fs.existsSync(DOCS_DIR)) return [];
  return fs.readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => [f.replace(/\.mdx$/, '')]);
}

export function getDocBySlug(slug: string[]): { content: string; title: string } | null {
  const filePath = path.join(DOCS_DIR, `${slug.join('/')}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return { content, title: titleMatch?.[1] ?? slug[slug.length - 1] };
}

export function getAllDocsMeta(): DocMeta[] {
  return getAllDocSlugs().map((slug) => {
    const doc = getDocBySlug(slug);
    return { slug, title: doc?.title ?? slug[0] };
  });
}

export function getPromptBySlug(slug: string[]): string | null {
  const filePath = path.join(PROMPTS_DIR, `${slug.join('/')}.md`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8').trim();
}
