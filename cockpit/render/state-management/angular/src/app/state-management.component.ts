// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { Component, input, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import {
  RenderSpecComponent,
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
  selector: 'demo-label',
  standalone: true,
  template: `
    <div class="flex items-center gap-2">
      <span class="text-gray-500 text-xs uppercase font-semibold">{{ label() }}:</span>
      <span class="text-gray-100 text-sm font-mono">{{ value() }}</span>
    </div>
  `,
})
class DemoLabelComponent {
  readonly label = input('');
  readonly value = input('');
  readonly childKeys = input<string[]>([]);
  readonly spec = input<Spec | null>(null);
}

/**
 * StateManagementComponent demonstrates signalStateStore from @cacheplane/render.
 *
 * Shows how to use get/set/update methods with JSON Pointer paths for
 * reactive state management. The main area renders a spec bound to state.
 * The sidebar has input fields that call store.set() and displays the
 * current state snapshot.
 */
@Component({
  selector: 'app-state-management',
  standalone: true,
  imports: [RenderSpecComponent, JsonPipe],
  template: `
    <div class="flex h-screen bg-gray-950 text-gray-100">
      <!-- Main area: render spec bound to state -->
      <main class="flex-1 min-w-0 p-8 overflow-y-auto">
        <h1 class="text-2xl font-bold mb-6">State Management</h1>
        <p class="text-gray-400 text-sm mb-6">
          The <code class="text-blue-400">signalStateStore</code> provides get/set/update
          methods with JSON Pointer paths. Render specs bind to state via
          <code class="text-blue-400">{{ '$state' }}</code> expressions.
        </p>
        <div class="rounded-lg border border-gray-800 p-6 bg-gray-900 space-y-3">
          <render-spec [spec]="spec" [registry]="registry" [store]="store" />
        </div>
      </main>

      <!-- Sidebar: form controls + state snapshot -->
      <aside class="w-96 shrink-0 border-l border-gray-800 overflow-y-auto p-4 space-y-4 bg-gray-950">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Edit State</h3>
        <div class="rounded-lg p-4 space-y-3 bg-gray-900 border border-gray-800">
          <div>
            <label class="block text-xs font-medium mb-1 text-gray-500">Name</label>
            <input class="w-full px-2 py-1 rounded text-sm bg-gray-950 text-gray-100 border border-gray-800 focus:border-blue-600 outline-none"
                   [value]="nameValue()"
                   (input)="onNameChange($event)" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1 text-gray-500">Age</label>
            <input class="w-full px-2 py-1 rounded text-sm bg-gray-950 text-gray-100 border border-gray-800 focus:border-blue-600 outline-none"
                   type="number"
                   [value]="ageValue()"
                   (input)="onAgeChange($event)" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1 text-gray-500">Theme</label>
            <select class="w-full px-2 py-1 rounded text-sm bg-gray-950 text-gray-100 border border-gray-800 focus:border-blue-600 outline-none"
                    [value]="themeValue()"
                    (change)="onThemeChange($event)">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>
        <button
          class="w-full px-3 py-1.5 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-500"
          (click)="batchUpdate()">
          Batch Update (reset to defaults)
        </button>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide mb-2 text-gray-500">Current State (getSnapshot)</h4>
          <pre class="text-xs font-mono overflow-x-auto p-3 rounded bg-gray-900 text-gray-400 border border-gray-800">{{ stateSnapshot() | json }}</pre>
        </div>
      </aside>
    </div>
  `,
})
export class StateManagementComponent {
  protected readonly registry = defineAngularRegistry({
    Text: DemoTextComponent,
    Label: DemoLabelComponent,
  });

  protected readonly store = signalStateStore({
    user: { name: 'Alice', age: 30 },
    settings: { theme: 'dark' },
  });

  protected readonly spec: Spec = {
    root: 'root',
    elements: {
      root: {
        type: 'Label',
        props: { label: 'Name', value: { $state: '/user/name' } },
        children: ['age', 'theme'],
      },
      age: {
        type: 'Label',
        props: { label: 'Age', value: { $state: '/user/age' } },
      },
      theme: {
        type: 'Label',
        props: { label: 'Theme', value: { $state: '/settings/theme' } },
      },
    },
  } as Spec;

  // Local signals to drive form inputs (store.get returns raw values)
  protected readonly nameValue = signal('Alice');
  protected readonly ageValue = signal(30);
  protected readonly themeValue = signal('dark');

  protected stateSnapshot() {
    return this.store.getSnapshot();
  }

  onNameChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.store.set('/user/name', value);
    this.nameValue.set(value);
  }

  onAgeChange(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.store.set('/user/age', value);
    this.ageValue.set(value);
  }

  onThemeChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.store.set('/settings/theme', value);
    this.themeValue.set(value);
  }

  batchUpdate() {
    this.store.update({
      '/user/name': 'Alice',
      '/user/age': 30,
      '/settings/theme': 'dark',
    });
    this.nameValue.set('Alice');
    this.ageValue.set(30);
    this.themeValue.set('dark');
  }
}
