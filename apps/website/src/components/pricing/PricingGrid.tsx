'use client';

const PLANS = [
  {
    name: 'Community',
    price: 'Free',
    period: 'noncommercial use',
    features: ['PolyForm Noncommercial 1.0.0', 'Personal projects', 'Academic & research', 'Non-profit internal use'],
    highlight: false,
    cta: 'Get Started',
    ctaHref: 'https://www.npmjs.com/package/@cacheplane/stream-resource',
  },
  {
    name: 'Developer Seat',
    price: '$500',
    period: '/seat/year',
    features: ['Commercial use', '12-month release lock', 'Email support', 'All features'],
    highlight: false,
    cta: 'Buy License',
    ctaHref: '#lead-form',
  },
  {
    name: 'App Deployment',
    price: '$2,000',
    period: '/app one-time',
    features: ['Per-application license', 'All environments covered', 'No seat limits', 'Perpetual for version'],
    highlight: false,
    cta: 'Buy License',
    ctaHref: '#lead-form',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'volume licensing',
    features: ['Volume licensing', 'Priority support', 'Custom contract'],
    highlight: true,
    cta: 'Contact Us',
    ctaHref: '#lead-form',
  },
];

export function PricingGrid() {
  return (
    <section className="px-8 py-16 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className="p-8 rounded-xl flex flex-col"
            style={{
              border: `1px solid ${plan.highlight ? '#6C8EFF' : 'rgba(108,142,255,0.15)'}`,
              boxShadow: plan.highlight ? '0 0 28px rgba(108,142,255,0.32)' : 'none',
              background: 'rgba(108,142,255,0.02)',
            }}>
            <p
              className="font-mono text-xs uppercase tracking-widest mb-4"
              style={{ color: '#6C8EFF' }}>
              {plan.name}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-garamond)',
                fontWeight: 700,
                fontSize: 48,
                color: '#EEF1FF',
                lineHeight: 1,
                marginBottom: 4,
              }}>
              {plan.price}
            </p>
            <p className="text-sm mb-8" style={{ color: '#4A527A' }}>{plan.period}</p>
            <ul className="flex flex-col gap-2 mb-8 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="text-sm flex items-center gap-2" style={{ color: '#8B96C8' }}>
                  <span style={{ color: '#6C8EFF' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a
              href={plan.ctaHref}
              className="text-center py-3 px-6 rounded font-mono text-sm transition-all"
              style={{
                background: plan.highlight ? '#6C8EFF' : 'transparent',
                color: plan.highlight ? '#fff' : '#6C8EFF',
                border: '1px solid #6C8EFF',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 0 16px rgba(108,142,255,0.4)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}>
              {plan.cta}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
