// SPDX-License-Identifier: MIT
import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
  output,
  signal,
  HostListener,
} from '@angular/core';
import type { AgentWithHistory } from '../../../agent';
import { CHAT_HOST_TOKENS } from '../../../styles/chat-tokens';
import { DebugCheckpointCardComponent, type DebugCheckpoint } from '../debug-checkpoint-card.component';
import { DebugStateDiffComponent } from '../debug-state-diff.component';
import { toDebugCheckpoint, extractStateValues } from '../debug-utils';

export type Direction = 'up' | 'down' | 'home' | 'end';

/**
 * Pure selection-step function. Exported for unit testing — the component's
 * keyboard handler delegates to it.
 */
export function stepSelection(dir: Direction, current: number, count: number): number {
  if (count === 0) return -1;
  switch (dir) {
    case 'down': return Math.min(current + 1, count - 1);
    case 'up':   return Math.max(current - 1, 0);
    case 'home': return 0;
    case 'end':  return count - 1;
  }
}

@Component({
  selector: 'chat-debug-timeline-inspector',
  standalone: true,
  imports: [DebugCheckpointCardComponent, DebugStateDiffComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    CHAT_HOST_TOKENS,
    `
    :host { display: flex; flex-direction: column; height: 100%; outline: none; }
    .timeline__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--ngaf-chat-space-2) var(--ngaf-chat-space-4);
      border-bottom: 1px solid var(--ngaf-chat-separator);
      font-size: var(--ngaf-chat-font-size-xs);
      color: var(--ngaf-chat-text-muted);
    }
    .timeline__clear {
      background: transparent;
      border: 0;
      cursor: pointer;
      color: var(--ngaf-chat-text-muted);
      font-size: var(--ngaf-chat-font-size-xs);
    }
    .timeline__clear:disabled { opacity: 0.5; cursor: default; }
    .timeline__list {
      flex: 1;
      overflow-y: auto;
      padding: var(--ngaf-chat-space-2) var(--ngaf-chat-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--ngaf-chat-space-2);
    }
    .timeline__row { display: flex; flex-direction: column; gap: var(--ngaf-chat-space-2); }
    .timeline__row-actions {
      display: none;
      gap: var(--ngaf-chat-space-2);
      padding-left: var(--ngaf-chat-space-3);
    }
    .timeline__row:hover .timeline__row-actions { display: flex; }
    .timeline__row button.row-action {
      background: transparent;
      border: 1px solid var(--ngaf-chat-separator);
      border-radius: var(--ngaf-chat-radius-button);
      padding: 2px 8px;
      font-size: var(--ngaf-chat-font-size-xs);
      color: var(--ngaf-chat-text-muted);
      cursor: pointer;
    }
    .timeline__row button.row-action:hover { color: var(--ngaf-chat-text); }
    .timeline__diff {
      padding: var(--ngaf-chat-space-2);
      background: var(--ngaf-chat-surface-alt);
      border-radius: var(--ngaf-chat-radius-card);
    }
    `,
  ],
  template: `
    <div class="timeline__header">
      <span>{{ checkpoints().length }} checkpoints</span>
      <button
        type="button"
        class="timeline__clear"
        [disabled]="selectedIndex() < 0"
        (click)="selectedIndex.set(-1)"
      >Clear selection</button>
    </div>
    <div
      class="timeline__list"
      tabindex="0"
      role="listbox"
      aria-label="Checkpoint timeline"
    >
      @for (cp of checkpoints(); let i = $index; track cp.checkpointId ?? i) {
        <div class="timeline__row">
          <chat-debug-checkpoint-card
            [checkpoint]="cp"
            [isSelected]="i === selectedIndex()"
            (selected)="selectedIndex.set(i)"
          />
          @if (i === selectedIndex() && cp.checkpointId) {
            <div class="timeline__row-actions">
              <button class="row-action" type="button" (click)="replayRequested.emit(cp.checkpointId!)">Replay</button>
              <button class="row-action" type="button" (click)="forkRequested.emit(cp.checkpointId!)">Fork</button>
            </div>
          }
          @if (i === selectedIndex()) {
            <div class="timeline__diff">
              <chat-debug-state-diff
                [before]="previousStateAt(i)"
                [after]="currentStateAt(i)"
              />
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TimelineInspectorComponent {
  readonly agent = input.required<AgentWithHistory>();
  readonly replayRequested = output<string>();
  readonly forkRequested = output<string>();

  readonly selectedIndex = signal<number>(-1);

  readonly checkpoints = computed((): DebugCheckpoint[] =>
    this.agent().history().map((cp, i) => toDebugCheckpoint(cp, i)),
  );

  currentStateAt(i: number): Record<string, unknown> {
    return extractStateValues(this.agent().history()[i]);
  }

  previousStateAt(i: number): Record<string, unknown> {
    if (i <= 0) return {};
    return extractStateValues(this.agent().history()[i - 1]);
  }

  @HostListener('keydown', ['$event'])
  protected onKey(ev: KeyboardEvent): void {
    const map: Record<string, Direction | undefined> = {
      ArrowDown: 'down',
      ArrowUp: 'up',
      Home: 'home',
      End: 'end',
    };
    const dir = map[ev.key];
    if (!dir) return;
    ev.preventDefault();
    this.selectedIndex.set(stepSelection(dir, this.selectedIndex(), this.checkpoints().length));
  }
}
