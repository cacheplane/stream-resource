// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { Component, input, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import {
  RenderSpecComponent,
  RenderElementComponent,
  defineAngularRegistry,
  signalStateStore,
} from '@cacheplane/render';
import type { Spec } from '@json-render/core';

// --- Inline view components ---

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
  selector: 'demo-container',
  standalone: true,
  imports: [RenderElementComponent],
  template: `
    <div class="pl-4 border-l-2 border-gray-700 space-y-2 py-1">
      @for (key of childKeys(); track key) {
        <render-element [elementKey]="key" [spec]="spec()!" />
      }
    </div>
  `,
})
class DemoContainerComponent {
  readonly childKeys = input<string[]>([]);
  readonly spec = input<Spec | null>(null);
}

/**
 * ElementRenderingComponent demonstrates nested element rendering with
 * visibility toggling via the render spec's `visible` property.
 *
 * Main area renders the spec tree. Sidebar has a toggle button and shows
 * the current JSON spec.
 */
@Component({
  selector: 'app-element-rendering',
  standalone: true,
  imports: [RenderSpecComponent, JsonPipe],
  template: `
    <div class="flex h-screen bg-gray-950 text-gray-100">
      <!-- Main area -->
      <main class="flex-1 min-w-0 p-8 overflow-y-auto">
        <h1 class="text-2xl font-bold mb-6">Element Rendering</h1>
        <p class="text-gray-400 text-sm mb-6">
          Nested element trees are recursively rendered. Each element can have
          a <code class="text-blue-400">visible</code> condition bound to the state store.
        </p>
        <div class="rounded-lg border border-gray-800 p-6 bg-gray-900">
          <render-spec [spec]="spec" [registry]="registry" [store]="store" />
        </div>
      </main>

      <!-- Sidebar -->
      <aside class="w-96 shrink-0 border-l border-gray-800 overflow-y-auto p-4 space-y-4 bg-gray-950">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Visibility Control</h3>
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-400">Detail visible:</span>
          <span class="text-sm font-mono" [class]="showDetail() ? 'text-green-400' : 'text-red-400'">
            {{ showDetail() }}
          </span>
        </div>
        <button
          class="w-full px-3 py-1.5 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-500"
          (click)="toggleVisibility()">
          Toggle Detail Visibility
        </button>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide mb-2 text-gray-500">JSON Spec</h4>
          <pre class="text-xs font-mono overflow-x-auto p-3 rounded bg-gray-900 text-gray-400 border border-gray-800">{{ spec | json }}</pre>
        </div>
      </aside>
    </div>
  `,
})
export class ElementRenderingComponent {
  protected readonly registry = defineAngularRegistry({
    Text: DemoTextComponent,
    Container: DemoContainerComponent,
  });

  protected readonly store = signalStateStore({ showDetail: true });

  protected readonly showDetail = signal(true);

  protected readonly spec: Spec = {
    root: 'root',
    elements: {
      root: {
        type: 'Container',
        props: {},
        children: ['always', 'toggleable'],
      },
      always: {
        type: 'Text',
        props: { content: 'Parent element (always visible)' },
      },
      toggleable: {
        type: 'Container',
        props: {},
        children: ['child1', 'child2'],
      },
      child1: {
        type: 'Text',
        props: { content: 'Child element (always visible)' },
      },
      child2: {
        type: 'Text',
        props: { content: 'Detail child (toggleable)' },
        visible: { path: '/showDetail', op: 'eq', value: true },
      },
    },
  } as Spec;

  toggleVisibility() {
    const current = this.store.get('/showDetail') as boolean;
    this.store.set('/showDetail', !current);
    this.showDetail.set(!current);
  }
}
