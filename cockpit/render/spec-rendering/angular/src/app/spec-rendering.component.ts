// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { Component, input, signal, computed } from '@angular/core';
import { JsonPipe } from '@angular/common';
import {
  RenderSpecComponent,
  defineAngularRegistry,
  signalStateStore,
} from '@cacheplane/render';
import type { Spec } from '@json-render/core';

// --- Inline view components registered in the demo registry ---

@Component({
  selector: 'demo-text',
  standalone: true,
  template: `<p class="text-gray-100 text-sm">{{ content() }}</p>`,
})
class DemoTextComponent {
  readonly content = input('');
  readonly childKeys = input<string[]>([]);
  readonly spec = input<Spec | null>(null);
}

@Component({
  selector: 'demo-heading',
  standalone: true,
  template: `<h2 class="text-lg font-bold text-gray-100">{{ content() }}</h2>`,
})
class DemoHeadingComponent {
  readonly content = input('');
  readonly childKeys = input<string[]>([]);
  readonly spec = input<Spec | null>(null);
}

@Component({
  selector: 'demo-badge',
  standalone: true,
  template: `<span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">{{ label() }}</span>`,
})
class DemoBadgeComponent {
  readonly label = input('');
  readonly childKeys = input<string[]>([]);
  readonly spec = input<Spec | null>(null);
}

/**
 * SpecRenderingComponent demonstrates RenderSpecComponent from @cacheplane/render.
 *
 * Shows how JSON render specs are converted into live Angular components.
 * The main area displays the rendered output via render-spec, while the
 * sidebar shows the JSON spec and a button to cycle through different specs.
 */
@Component({
  selector: 'app-spec-rendering',
  standalone: true,
  imports: [RenderSpecComponent, JsonPipe],
  template: `
    <div class="flex h-screen bg-gray-950 text-gray-100">
      <!-- Main area: rendered output -->
      <main class="flex-1 min-w-0 p-8 overflow-y-auto">
        <h1 class="text-2xl font-bold mb-6">Spec Rendering</h1>
        <p class="text-gray-400 text-sm mb-6">
          RenderSpecComponent takes a JSON spec and a registry of component types,
          then renders the spec tree into live Angular components.
        </p>
        <div class="rounded-lg border border-gray-800 p-6 bg-gray-900">
          <render-spec [spec]="currentSpec()" [registry]="registry" [store]="store" />
        </div>
      </main>

      <!-- Sidebar: spec JSON + controls -->
      <aside class="w-96 shrink-0 border-l border-gray-800 overflow-y-auto p-4 space-y-4 bg-gray-950">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Active Spec ({{ specIndex() + 1 }} / {{ specs.length }})
        </h3>
        <button
          class="w-full px-3 py-1.5 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-500"
          (click)="cycleSpec()">
          Next Spec
        </button>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide mb-2 text-gray-500">JSON Spec</h4>
          <pre class="text-xs font-mono overflow-x-auto p-3 rounded bg-gray-900 text-gray-400 border border-gray-800">{{ currentSpec() | json }}</pre>
        </div>
      </aside>
    </div>
  `,
})
export class SpecRenderingComponent {
  protected readonly registry = defineAngularRegistry({
    Text: DemoTextComponent,
    Heading: DemoHeadingComponent,
    Badge: DemoBadgeComponent,
  });

  protected readonly store = signalStateStore({ greeting: 'Hello from RenderSpec!' });

  protected readonly specs: Spec[] = [
    {
      root: 'root',
      elements: {
        root: {
          type: 'Heading',
          props: { content: 'Welcome to Spec Rendering' },
          children: ['desc'],
        },
        desc: {
          type: 'Text',
          props: { content: 'This UI is rendered entirely from a JSON specification.' },
        },
      },
    } as Spec,
    {
      root: 'root',
      elements: {
        root: {
          type: 'Badge',
          props: { label: 'Live Preview' },
          children: ['info'],
        },
        info: {
          type: 'Text',
          props: { content: 'Badges, headings, and text -- all from JSON.' },
        },
      },
    } as Spec,
    {
      root: 'root',
      elements: {
        root: {
          type: 'Text',
          props: { content: { $state: '/greeting' } },
          children: ['sub'],
        },
        sub: {
          type: 'Badge',
          props: { label: 'State-bound' },
        },
      },
    } as Spec,
  ];

  protected readonly specIndex = signal(0);

  protected readonly currentSpec = computed(() => this.specs[this.specIndex()]);

  cycleSpec() {
    this.specIndex.update(i => (i + 1) % this.specs.length);
  }
}
