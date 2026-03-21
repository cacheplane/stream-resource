import React from 'react';
import { cockpitManifest } from '../../../../libs/cockpit-registry/src/index';
import type { CapabilityPresentation, NavigationProduct } from '../lib/route-resolution';
import { CodePane } from './code-pane/code-pane';
import { DocsPane } from './docs-pane/docs-pane';
import { LanguageSwitcher } from './language-switcher';
import { NavigationTree } from './navigation/navigation-tree';
import { PromptPane } from './prompt-pane/prompt-pane';

interface CockpitShellProps {
  navigationTree: NavigationProduct[];
  presentation: CapabilityPresentation;
  entryTitle: string;
}

export function CockpitShell({
  navigationTree,
  presentation,
  entryTitle,
}: CockpitShellProps) {
  return (
    <main>
      <h1>Cockpit</h1>
      <p>Manifest-driven shell for representative cockpit capabilities.</p>
      <h2>{entryTitle}</h2>
      <NavigationTree tree={navigationTree} />
      <LanguageSwitcher manifest={cockpitManifest} entry={presentation.entry} />
      <DocsPane path={presentation.docsPath} />
      {presentation.kind === 'capability' ? (
        <>
          <CodePane paths={presentation.codeAssetPaths} />
          <PromptPane paths={presentation.promptAssetPaths} />
        </>
      ) : null}
    </main>
  );
}
