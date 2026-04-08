// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { Component, input, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import {
  RenderSpecComponent,
  defineAngularRegistry,
  signalStateStore,
} from '@cacheplane/render';
import type { Spec } from '@json-render/core';

// --- Inline view component for repeat items ---

@Component({
  selector: 'demo-task-item',
  standalone: true,
  template: `
    <div class="flex items-center gap-2 px-3 py-2 rounded bg-gray-900 border border-gray-800">
      <span class="w-2 h-2 rounded-full" [class]="done() ? 'bg-green-400' : 'bg-yellow-400'"></span>
      <span class="text-sm text-gray-100 flex-1">{{ name() }}</span>
      <span class="text-xs text-gray-500">{{ done() ? 'Done' : 'Pending' }}</span>
    </div>
  `,
})
class DemoTaskItemComponent {
  readonly name = input('');
  readonly done = input(false);
  readonly childKeys = input<string[]>([]);
  readonly spec = input<Spec | null>(null);
}

/**
 * RepeatLoopsComponent demonstrates repeat/list rendering from @cacheplane/render.
 *
 * Shows how to iterate over arrays in the state store using a repeat spec.
 * The main area renders the list via render-spec. The sidebar has
 * add/remove buttons and shows the array state.
 */
@Component({
  selector: 'app-repeat-loops',
  standalone: true,
  imports: [RenderSpecComponent, JsonPipe],
  template: `
    <div class="flex h-screen bg-gray-950 text-gray-100">
      <!-- Main area: rendered list -->
      <main class="flex-1 min-w-0 p-8 overflow-y-auto">
        <h1 class="text-2xl font-bold mb-6">Repeat Loops</h1>
        <p class="text-gray-400 text-sm mb-6">
          Elements with a <code class="text-blue-400">repeat</code> property iterate over
          an array in the state store, rendering one instance per item.
        </p>
        <div class="rounded-lg border border-gray-800 p-6 bg-gray-900 space-y-2">
          <render-spec [spec]="spec" [registry]="registry" [store]="store" />
        </div>
      </main>

      <!-- Sidebar: controls + state -->
      <aside class="w-96 shrink-0 border-l border-gray-800 overflow-y-auto p-4 space-y-4 bg-gray-950">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">List Controls</h3>
        <div class="rounded-lg p-4 space-y-3 bg-gray-900 border border-gray-800">
          <ul class="space-y-1">
            @for (item of itemsList(); track $index) {
              <li class="flex items-center justify-between text-sm px-2 py-1 rounded bg-gray-950">
                <span class="text-gray-300">{{ item.name }}</span>
                <button class="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 hover:bg-red-900 hover:text-red-300"
                        (click)="removeItem($index)">Remove</button>
              </li>
            }
          </ul>
          <button
            class="w-full px-3 py-1.5 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-500"
            (click)="addItem()">
            Add Item
          </button>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide mb-2 text-gray-500">Array State</h4>
          <pre class="text-xs font-mono overflow-x-auto p-3 rounded bg-gray-900 text-gray-400 border border-gray-800">{{ itemsList() | json }}</pre>
        </div>
      </aside>
    </div>
  `,
})
export class RepeatLoopsComponent {
  protected readonly registry = defineAngularRegistry({
    TaskItem: DemoTaskItemComponent,
  });

  protected readonly store = signalStateStore({
    items: [
      { name: 'Task Alpha', done: false },
      { name: 'Task Beta', done: true },
      { name: 'Task Gamma', done: false },
    ],
  });

  protected readonly spec: Spec = {
    root: 'root',
    elements: {
      root: {
        type: 'TaskItem',
        props: {
          name: { $item: 'name' },
          done: { $item: 'done' },
        },
        repeat: { statePath: '/items' },
      },
    },
  } as Spec;

  protected readonly itemsList = signal([
    { name: 'Task Alpha', done: false },
    { name: 'Task Beta', done: true },
    { name: 'Task Gamma', done: false },
  ]);

  private counter = 0;

  addItem() {
    this.counter++;
    const items = [...this.itemsList(), { name: `Task ${this.counter}`, done: false }];
    this.store.set('/items', items);
    this.itemsList.set(items);
  }

  removeItem(index: number) {
    const items = this.itemsList().filter((_, i) => i !== index);
    this.store.set('/items', items);
    this.itemsList.set(items);
  }
}
