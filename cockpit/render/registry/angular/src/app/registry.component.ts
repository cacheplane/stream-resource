// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { Component, input } from '@angular/core';
import { JsonPipe } from '@angular/common';
import {
  RenderSpecComponent,
  RenderElementComponent,
  defineAngularRegistry,
  signalStateStore,
} from '@cacheplane/render';
import type { Spec } from '@json-render/core';

// --- Inline view components registered in the demo ---

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
  selector: 'demo-card',
  standalone: true,
  imports: [RenderElementComponent],
  template: `
    <div class="rounded-lg border border-gray-700 p-4 bg-gray-900 space-y-2">
      <h3 class="text-sm font-semibold text-blue-400">{{ title() }}</h3>
      @for (key of childKeys(); track key) {
        <render-element [elementKey]="key" [spec]="spec()!" />
      }
    </div>
  `,
})
class DemoCardComponent {
  readonly title = input('');
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
 * RegistryComponent demonstrates defineAngularRegistry from @cacheplane/render.
 *
 * Shows how to create a component registry, list registered types, and
 * render specs that reference those types. The sidebar displays the
 * registered type names and their count.
 */
@Component({
  selector: 'app-registry',
  standalone: true,
  imports: [RenderSpecComponent, JsonPipe],
  template: `
    <div class="flex h-screen bg-gray-950 text-gray-100">
      <!-- Main area: rendered spec using the registry -->
      <main class="flex-1 min-w-0 p-8 overflow-y-auto">
        <h1 class="text-2xl font-bold mb-6">Component Registry</h1>
        <p class="text-gray-400 text-sm mb-6">
          <code class="text-blue-400">defineAngularRegistry</code> maps type strings
          to Angular components. Render specs reference types by name and the
          registry resolves them at render time.
        </p>
        <div class="rounded-lg border border-gray-800 p-6 bg-gray-900 space-y-4">
          <render-spec [spec]="spec" [registry]="registry" [store]="store" />
        </div>
      </main>

      <!-- Sidebar: registry info -->
      <aside class="w-96 shrink-0 border-l border-gray-800 overflow-y-auto p-4 space-y-4 bg-gray-950">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Registered Types</h3>
        <div class="rounded-lg p-4 space-y-3 bg-gray-900 border border-gray-800">
          <ul class="space-y-1">
            @for (name of registeredNames; track name) {
              <li class="text-sm font-mono px-2 py-1 rounded bg-gray-950 text-gray-300">{{ name }}</li>
            }
          </ul>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 uppercase font-semibold">Total count:</span>
          <span class="text-lg font-bold text-gray-100">{{ registeredNames.length }}</span>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide mb-2 text-gray-500">Registry Names (JSON)</h4>
          <pre class="text-xs font-mono overflow-x-auto p-3 rounded bg-gray-900 text-gray-400 border border-gray-800">{{ registeredNames | json }}</pre>
        </div>
      </aside>
    </div>
  `,
})
export class RegistryComponent {
  protected readonly registry = defineAngularRegistry({
    Heading: DemoHeadingComponent,
    Text: DemoTextComponent,
    Card: DemoCardComponent,
    Badge: DemoBadgeComponent,
  });

  protected readonly registeredNames = this.registry.names();

  protected readonly store = signalStateStore({});

  protected readonly spec: Spec = {
    root: 'root',
    elements: {
      root: {
        type: 'Card',
        props: { title: 'Registry Demo' },
        children: ['heading', 'desc', 'badge'],
      },
      heading: {
        type: 'Heading',
        props: { content: 'All components resolved from registry' },
      },
      desc: {
        type: 'Text',
        props: { content: 'Each element type in the spec is looked up in the registry at render time.' },
      },
      badge: {
        type: 'Badge',
        props: { label: 'Registered' },
      },
    },
  } as Spec;
}
