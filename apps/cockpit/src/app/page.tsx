import React from 'react';
import { CockpitShell } from '../components/cockpit-shell';
import { getCockpitPageModel } from '../lib/cockpit-page';

export default function CockpitHomePage() {
  const { entry, presentation, navigationTree } = getCockpitPageModel();

  return (
    <CockpitShell
      navigationTree={navigationTree}
      presentation={presentation}
      entryTitle={entry.title}
    />
  );
}
