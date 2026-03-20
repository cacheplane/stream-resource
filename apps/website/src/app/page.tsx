import Script from 'next/script';
import { HeroTwoCol } from '../components/landing/HeroTwoCol';
import { ArchDiagram } from '../components/landing/ArchDiagram';
import { FeatureStrip } from '../components/landing/FeatureStrip';
import { CodeBlock } from '../components/landing/CodeBlock';

export default async function HomePage() {
  return (
    <>
      <HeroTwoCol />
      <ArchDiagram />
      <FeatureStrip />
      <CodeBlock />

      {/* Angular Elements live demo */}
      <section className="px-8 py-16 max-w-3xl mx-auto">
        <p className="font-mono text-xs uppercase tracking-widest mb-8 text-center"
          style={{ color: '#6C8EFF' }}>Live Demo</p>
        <div className="rounded-xl overflow-hidden"
          style={{ border: '1px solid #6C8EFF', boxShadow: '0 0 30px rgba(108,142,255,0.25)' }}>
          {/* @ts-expect-error — custom element registered by Angular Elements bundle */}
          <stream-chat-demo
            api-url={process.env['NEXT_PUBLIC_LANGGRAPH_URL'] ?? 'http://localhost:2024'}
            assistant-id="chat_agent"
          />
        </div>
        <Script src="/demo/main.js" strategy="lazyOnload" />
      </section>
    </>
  );
}
