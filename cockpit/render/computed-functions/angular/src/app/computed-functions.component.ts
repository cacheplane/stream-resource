// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { Component, input, computed, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import {
  RenderSpecComponent,
  defineAngularRegistry,
  signalStateStore,
} from '@cacheplane/render';
import type { Spec } from '@json-render/core';

// --- Inline view component ---

@Component({
  selector: 'demo-value',
  standalone: true,
  template: `
    <div class="flex items-center gap-2 py-1">
      <span class="text-gray-500 text-xs uppercase font-semibold min-w-[120px]">{{ label() }}:</span>
      <span class="text-gray-100 text-sm font-mono">{{ value() }}</span>
    </div>
  `,
})
class DemoValueComponent {
  readonly label = input('');
  readonly value = input<unknown>('');
  readonly childKeys = input<string[]>([]);
  readonly spec = input<Spec | null>(null);
}

/**
 * ComputedFunctionsComponent demonstrates computed functions from @cacheplane/render.
 *
 * Shows how custom functions registered via provideRender transform data
 * for prop resolution in render specs. The main area renders computed values.
 * The sidebar shows the function registry, live computed outputs, and an
 * editable input.
 */
@Component({
  selector: 'app-computed-functions',
  standalone: true,
  imports: [RenderSpecComponent, JsonPipe],
  template: `
    <div class="flex h-screen bg-gray-950 text-gray-100">
      <!-- Main area: computed value demos -->
      <main class="flex-1 min-w-0 p-8 overflow-y-auto">
        <h1 class="text-2xl font-bold mb-6">Computed Functions</h1>
        <p class="text-gray-400 text-sm mb-6">
          Custom functions are registered via <code class="text-blue-400">provideRender</code>
          and invoked in render specs with <code class="text-blue-400">{{ '$fn' }}</code> expressions.
          Each function receives <code class="text-blue-400">args: Record&lt;string, unknown&gt;</code>.
        </p>
        <div class="rounded-lg border border-gray-800 p-6 bg-gray-900 space-y-2">
          <render-spec [spec]="spec" [registry]="registry" [store]="store" />
        </div>
      </main>

      <!-- Sidebar: function registry + live outputs -->
      <aside class="w-96 shrink-0 border-l border-gray-800 overflow-y-auto p-4 space-y-4 bg-gray-950">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Registered Functions</h3>
        <div class="rounded-lg p-4 space-y-1 bg-gray-900 border border-gray-800">
          @for (name of functionNames; track name) {
            <div class="text-sm font-mono px-2 py-1 rounded bg-gray-950 text-gray-300">{{ name }}</div>
          }
        </div>

        <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Live Computed Outputs</h3>
        <div class="rounded-lg p-4 space-y-3 bg-gray-900 border border-gray-800">
          <div>
            <label class="block text-xs font-medium mb-1 text-gray-500">formatDate("2024-06-15")</label>
            <span class="text-sm text-gray-100">{{ formattedDate() }}</span>
          </div>
          <div>
            <label class="block text-xs font-medium mb-1 text-gray-500">uppercase("render specs")</label>
            <span class="text-sm text-gray-100">{{ uppercased() }}</span>
          </div>
          <div>
            <label class="block text-xs font-medium mb-1 text-gray-500">multiply(7, 6)</label>
            <span class="text-sm text-gray-100">{{ multiplied() }}</span>
          </div>
          <div>
            <label class="block text-xs font-medium mb-1 text-gray-500">Input Value</label>
            <input class="w-full px-2 py-1 rounded text-sm bg-gray-950 text-gray-100 border border-gray-800 focus:border-blue-600 outline-none"
                   [value]="inputValue()"
                   (input)="inputValue.set($any($event.target).value)" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1 text-gray-500">reverse(input)</label>
            <span class="text-sm text-gray-100 font-mono">{{ reversed() }}</span>
          </div>
        </div>

        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide mb-2 text-gray-500">Function Config (JSON)</h4>
          <pre class="text-xs font-mono overflow-x-auto p-3 rounded bg-gray-900 text-gray-400 border border-gray-800">{{ functionNames | json }}</pre>
        </div>
      </aside>
    </div>
  `,
})
export class ComputedFunctionsComponent {
  protected readonly registry = defineAngularRegistry({
    Value: DemoValueComponent,
  });

  protected readonly store = signalStateStore({
    dateStr: '2024-06-15T12:00:00Z',
    text: 'render specs are powerful',
    a: 7,
    b: 6,
  });

  protected readonly spec: Spec = {
    root: 'root',
    elements: {
      root: {
        type: 'Value',
        props: {
          label: 'Formatted Date',
          value: { $fn: 'formatDate', args: { value: { $state: '/dateStr' } } },
        },
        children: ['upper', 'mult'],
      },
      upper: {
        type: 'Value',
        props: {
          label: 'Uppercase',
          value: { $fn: 'uppercase', args: { value: { $state: '/text' } } },
        },
      },
      mult: {
        type: 'Value',
        props: {
          label: 'Multiply',
          value: { $fn: 'multiply', args: { a: { $state: '/a' }, b: { $state: '/b' } } },
        },
      },
    },
  } as Spec;

  protected readonly inputValue = signal('hello world');

  protected readonly formattedDate = computed(() =>
    new Date('2024-06-15T12:00:00Z').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  );

  protected readonly uppercased = computed(() => 'render specs are powerful'.toUpperCase());
  protected readonly multiplied = computed(() => 7 * 6);
  protected readonly reversed = computed(() =>
    this.inputValue().split('').reverse().join('')
  );

  protected readonly functionNames = ['formatDate', 'uppercase', 'multiply', 'reverse'];
}
