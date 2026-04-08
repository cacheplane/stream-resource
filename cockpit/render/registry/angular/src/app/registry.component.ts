// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { Component } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ChatComponent } from '@cacheplane/chat';
import { RenderSpecComponent, defineAngularRegistry } from '@cacheplane/render';
import { streamResource } from '@cacheplane/stream-resource';
import { environment } from '../environments/environment';

/**
 * RegistryComponent demonstrates defineAngularRegistry from @cacheplane/render.
 *
 * Shows how to create a component registry, list registered types, and
 * look up components by type string. The sidebar displays the list of
 * registered component types.
 */
@Component({
  selector: 'app-registry',
  standalone: true,
  imports: [ChatComponent, RenderSpecComponent, JsonPipe],
  template: `
    <div class="flex h-screen">
      <chat [ref]="stream" class="flex-1 min-w-0" />
      <aside class="w-80 shrink-0 border-l overflow-y-auto p-4 space-y-4"
             style="border-color: var(--chat-border, #333); background: var(--chat-bg, #171717); color: var(--chat-text, #e0e0e0);">
        <h3 class="text-xs font-semibold uppercase tracking-wide"
            style="color: var(--chat-text-muted, #777);">Component Registry</h3>
        <div class="registry-info rounded-lg p-4 space-y-3" style="background: var(--chat-surface, #222);">
          <div>
            <h4 class="text-xs font-medium mb-2" style="color: var(--chat-text-muted, #777);">Registered Types</h4>
            <ul class="space-y-1">
              @for (name of registeredNames; track name) {
                <li class="text-sm font-mono px-2 py-1 rounded"
                    style="background: var(--chat-bg, #171717);">{{ name }}</li>
              }
            </ul>
          </div>
          <div>
            <h4 class="text-xs font-medium mb-2" style="color: var(--chat-text-muted, #777);">Total Count</h4>
            <span class="text-lg font-bold">{{ registeredNames.length }}</span>
          </div>
        </div>
        <div class="mt-4">
          <h4 class="text-xs font-semibold uppercase tracking-wide mb-2"
              style="color: var(--chat-text-muted, #777);">Registry Names</h4>
          <pre class="text-xs font-mono overflow-x-auto p-2 rounded"
               style="background: var(--chat-surface, #222); color: var(--chat-text-muted, #777);">{{ registeredNames | json }}</pre>
        </div>
      </aside>
    </div>
  `,
})
export class RegistryComponent {
  protected readonly stream = streamResource({
    apiUrl: environment.langGraphApiUrl,
    assistantId: environment.streamingAssistantId,
  });

  private readonly registry = defineAngularRegistry({});

  protected readonly registeredNames = this.registry.names();
}
