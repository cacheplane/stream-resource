import { notFound } from 'next/navigation';
import { DocsSidebar } from '../../../components/docs/DocsSidebar';
import { MdxRenderer } from '../../../components/docs/MdxRenderer';
import { getDocBySlug, getAllDocSlugs, getPromptBySlug } from '../../../lib/docs';

export function generateStaticParams() {
  return getAllDocSlugs().map((slug) => ({ slug }));
}

export default async function DocsPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug ?? ['introduction'];
  const doc = getDocBySlug(slug);
  if (!doc) notFound();
  const prompt = getPromptBySlug(slug) ?? undefined;

  return (
    <div className="flex min-h-screen pt-16">
      <DocsSidebar activeSlug={slug.join('/')} />
      <MdxRenderer source={doc.content} prompt={prompt} />
    </div>
  );
}
