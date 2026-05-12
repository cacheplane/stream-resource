// libs/chat/src/lib/primitives/chat-project-list/chat-project-list.component.ts
// SPDX-License-Identifier: MIT
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CHAT_HOST_TOKENS } from '../../styles/chat-tokens';

export type Project = {
  id: string;
  name: string;
  /** Open shape — consumers may add icon, color, createdAt, etc. */
  [key: string]: unknown;
};

export interface ProjectActionAdapter {
  /** Create a new project. Returns the new project id; consumer is expected
   *  to also refresh its projects signal. */
  create?(name: string): Promise<{ id: string }>;
  rename?(projectId: string, newName: string): Promise<void>;
  /** Permanently delete the project. The framework calls this AFTER user
   *  confirms via the confirm dialog. */
  delete?(projectId: string): Promise<void>;
}

@Component({
  selector: 'chat-project-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [CHAT_HOST_TOKENS],
  template: ``,
})
export class ChatProjectListComponent {
  readonly projects = input.required<Project[]>();
  readonly activeProjectId = input<string | null>(null);
  readonly showNewProjectButton = input<boolean>(false);
  readonly actions = input<ProjectActionAdapter | null>(null);
  readonly projectSelected = output<string>();
  readonly newProjectRequested = output<void>();
}
