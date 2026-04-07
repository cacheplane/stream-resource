'use client';
import { motion } from 'framer-motion';
import { tokens } from '../../../lib/design-tokens';

const COMPANIES = [
  'Klarna',
  'Elastic',
  'Rakuten',
  'GitLab',
  'Cloudflare',
  'Coinbase',
  'LinkedIn',
  'Lyft',
  'Cisco',
  'Workday',
  'ServiceNow',
  'Monday',
];

/** Duplicate for seamless infinite scroll */
const SCROLL_ITEMS = [...COMPANIES, ...COMPANIES];

export function SocialProof() {
  return (
    <section style={{ padding: '32px 0', overflow: 'hidden' }}>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {/* Eyebrow */}
        <p style={{
          textAlign: 'center',
          fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
          fontSize: '0.6rem',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontWeight: 700,
          color: tokens.colors.textMuted,
          marginBottom: 20,
        }}>
          Built for teams shipping with LangChain
        </p>

        {/* Scrolling logo strip */}
        <div style={{
          position: 'relative',
          maxWidth: 1000,
          margin: '0 auto',
          borderRadius: 18,
          background: tokens.glass.bg,
          backdropFilter: `blur(${tokens.glass.blur})`,
          WebkitBackdropFilter: `blur(${tokens.glass.blur})`,
          border: `1px solid ${tokens.glass.border}`,
          overflow: 'hidden',
          padding: '28px 0',
        }}>
          {/* Fade edges */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, zIndex: 1,
            background: 'linear-gradient(to right, rgba(255,255,255,0.7), transparent)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, zIndex: 1,
            background: 'linear-gradient(to left, rgba(255,255,255,0.7), transparent)',
            pointerEvents: 'none',
          }} />

          {/* Scrolling track */}
          <div
            className="logo-scroll-track"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 64,
              width: 'max-content',
              paddingLeft: 32,
              paddingRight: 32,
            }}
          >
            {SCROLL_ITEMS.map((company, i) => (
              <div
                key={`${company}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 36,
                  flexShrink: 0,
                  opacity: 0.3,
                  filter: 'grayscale(100%)',
                  userSelect: 'none',
                }}
              >
                <svg
                  height="24"
                  viewBox={`0 0 ${company.length * 11 + 8} 28`}
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  role="img"
                  aria-label={company}
                >
                  <text
                    x="4"
                    y="21"
                    fill={tokens.colors.textPrimary}
                    fontFamily="Inter, system-ui, -apple-system, sans-serif"
                    fontSize="20"
                    fontWeight="700"
                    letterSpacing="-0.02em"
                  >
                    {company}
                  </text>
                </svg>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <style>{`
        @keyframes logo-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .logo-scroll-track {
          animation: logo-scroll 35s linear infinite;
        }
        .logo-scroll-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
