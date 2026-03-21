import { redirect } from 'next/navigation';
import { CockpitShell } from '../../components/cockpit-shell';
import { getCockpitPageModel } from '../../lib/cockpit-page';

export default async function CockpitRoutePage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const { entry, presentation, navigationTree, canonicalPath } =
    getCockpitPageModel(slug);
  const requestedPath = `/${slug.join('/')}`;

  if (slug.length > 0 && requestedPath !== canonicalPath) {
    redirect(canonicalPath);
  }

  return (
    <CockpitShell
      navigationTree={navigationTree}
      presentation={presentation}
      entryTitle={entry.title}
    />
  );
}
