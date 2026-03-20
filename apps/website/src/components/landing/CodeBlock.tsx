import { codeToHtml } from 'shiki';

const EXAMPLE = `// app.config.ts
provideStreamResource({ apiUrl: 'http://localhost:2024' })

// chat.component.ts
const chat = streamResource<{ messages: BaseMessage[] }>({
  assistantId: 'chat_agent',
  threadId: signal(this.threadId),
  onThreadId: (id) => localStorage.setItem('threadId', id),
});`;

const TEMPLATE_EXAMPLE = `<!-- chat.component.html -->
@for (msg of chat.messages(); track $index) {
  <p>{{ msg.content }}</p>
}
<button (click)="chat.submit({ messages: [input] })">Send</button>`;

export async function CodeBlock() {
  const tsHtml = await codeToHtml(EXAMPLE, {
    lang: 'typescript',
    theme: 'tokyo-night',
  });

  const templateHtml = await codeToHtml(TEMPLATE_EXAMPLE, {
    lang: 'html',
    theme: 'tokyo-night',
  });

  // tsHtml and templateHtml are trusted Shiki output generated at build time
  // from hardcoded strings — not user input
  return (
    <section className="px-8 py-16 max-w-4xl mx-auto">
      <p className="font-mono text-xs uppercase tracking-widest mb-8 text-center"
        style={{ color: 'var(--color-accent)' }}>30-second example</p>
      <div
        className="rounded-t-xl overflow-hidden text-sm leading-relaxed"
        style={{ border: '1px solid rgba(108,142,255,0.15)', borderBottom: 'none' }}
        dangerouslySetInnerHTML={{ __html: tsHtml }}
      />
      <div
        className="rounded-b-xl overflow-hidden text-sm leading-relaxed"
        style={{ border: '1px solid rgba(108,142,255,0.15)', borderTop: '1px solid rgba(108,142,255,0.08)' }}
        dangerouslySetInnerHTML={{ __html: templateHtml }}
      />
    </section>
  );
}
