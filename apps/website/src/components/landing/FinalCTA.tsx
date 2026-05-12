import { tokens } from '@ngaf/design-tokens';
import { Container } from '../ui/Container';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';

export function FinalCTA() {
  return (
    <Section surface="tinted" ariaLabelledBy="final-cta-heading">
      <Container>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <h2
            id="final-cta-heading"
            style={{
              fontFamily: tokens.typography.h2.family,
              fontSize: tokens.typography.h2.size,
              lineHeight: tokens.typography.h2.line,
              fontWeight: 700,
              color: tokens.colors.textPrimary,
              margin: 0,
              marginBottom: 16,
              letterSpacing: '-0.015em',
              fontStyle: 'italic',
            }}
          >
            Stop stalling on agentic Angular.
          </h2>
          <p
            style={{
              fontFamily: tokens.typography.bodyLg.family,
              fontSize: tokens.typography.bodyLg.size,
              lineHeight: tokens.typography.bodyLg.line,
              color: tokens.colors.textSecondary,
              margin: 0,
              marginBottom: 32,
            }}
          >
            Install the framework, read the docs, and have a streaming chat in your app this afternoon.
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 16,
            }}
          >
            <Button variant="primary" size="lg" href="/docs">
              Get started
            </Button>
            <Button
              variant="ghost"
              size="lg"
              href="https://cockpit.cacheplane.ai"
              target="_blank"
              rel="noopener noreferrer"
            >
              See it live →
            </Button>
          </div>
          <p
            style={{
              fontFamily: tokens.typography.caption.family,
              fontSize: tokens.typography.caption.size,
              color: tokens.colors.textMuted,
              margin: 0,
            }}
          >
            MIT · No signup required · No telemetry
          </p>
        </div>
      </Container>
    </Section>
  );
}
