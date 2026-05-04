// libs/chat/src/lib/streaming/streaming-markdown.component.ts
// SPDX-License-Identifier: MIT
import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import {
  createPartialMarkdownParser,
  type MarkdownDocumentNode,
  type PartialMarkdownParser,
} from '@cacheplane/partial-markdown';
import type { ViewRegistry } from '@ngaf/render';
import { CHAT_MARKDOWN_STYLES } from '../styles/chat-markdown.styles';
import { MARKDOWN_VIEW_REGISTRY } from '../markdown/markdown-view-registry';
import { MarkdownChildrenComponent } from '../markdown/markdown-children.component';
import { cacheplaneMarkdownViews } from '../markdown/cacheplane-markdown-views';

/**
 * Renders streaming markdown by walking a @cacheplane/partial-markdown AST
 * through @ngaf/render's view registry. Identity preservation in the parser
 * propagates through Angular's `track $any($node)` so unchanged subtrees
 * never re-render.
 *
 * Override per-node-type renderers via the `[viewRegistry]` input or by
 * supplying a different `MARKDOWN_VIEW_REGISTRY` provider in the injector
 * tree.
 */
@Component({
  selector: 'chat-streaming-md',
  standalone: true,
  imports: [MarkdownChildrenComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: CHAT_MARKDOWN_STYLES,
  template: `
    @if (root(); as r) {
      <md-children [parent]="r" />
    }
  `,
  providers: [
    {
      provide: MARKDOWN_VIEW_REGISTRY,
      useFactory: (host: ChatStreamingMdComponent) => host.resolvedRegistry(),
      deps: [ChatStreamingMdComponent],
    },
  ],
})
export class ChatStreamingMdComponent {
  readonly content = input<string>('');
  readonly streaming = input<boolean>(false);
  readonly viewRegistry = input<ViewRegistry | undefined>(undefined);

  readonly resolvedRegistry = computed(
    () => this.viewRegistry() ?? cacheplaneMarkdownViews,
  );

  // Parser instance is rebuilt only when content diverges from the prior
  // prefix (rare). For the common streaming case where content extends the
  // prior content, we push the delta and reuse the existing parser tree.
  private parser: PartialMarkdownParser = createPartialMarkdownParser();
  private prior = '';
  private finished = false;

  readonly root = computed<MarkdownDocumentNode | null>(() => {
    const c = this.content();
    const isStreaming = this.streaming();
    if (c !== this.prior) {
      if (c.startsWith(this.prior)) {
        this.parser.push(c.slice(this.prior.length));
      } else {
        // Content shrank or diverged — reset.
        this.parser = createPartialMarkdownParser();
        this.finished = false;
        if (c.length > 0) this.parser.push(c);
      }
      if (!isStreaming && !this.finished) {
        this.parser.finish();
        this.finished = true;
      }
      this.prior = c;
    } else if (!isStreaming && !this.finished) {
      // Streaming flipped to false without new content; ensure parser is finalized.
      this.parser.finish();
      this.finished = true;
    }
    return this.parser.root;
  });
}
