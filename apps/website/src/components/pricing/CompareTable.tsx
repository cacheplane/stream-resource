'use client';

const ROWS = [
  { feature: 'npm install', oss: true, seat: true, app: true, enterprise: true },
  { feature: 'Commercial use', oss: false, seat: true, app: true, enterprise: true },
  { feature: 'All Angular versions', oss: true, seat: true, app: true, enterprise: true },
  { feature: 'Email support', oss: false, seat: true, app: true, enterprise: true },
  { feature: 'Source access', oss: true, seat: true, app: true, enterprise: true },
  { feature: 'Per-app deployment', oss: false, seat: false, app: true, enterprise: true },
  { feature: 'Volume licensing', oss: false, seat: false, app: false, enterprise: true },
  { feature: 'Priority support', oss: false, seat: false, app: false, enterprise: true },
];

const Check = () => <span style={{ color: '#6C8EFF' }}>✓</span>;
const X = () => <span style={{ color: '#4A527A' }}>—</span>;

export function CompareTable() {
  return (
    <section className="px-8 py-8 max-w-6xl mx-auto overflow-x-auto">
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(108,142,255,0.15)' }}>
            <th className="text-left py-3 font-mono text-xs uppercase" style={{ color: '#4A527A' }}>Feature</th>
            {['Community', 'Developer Seat', 'App Deployment', 'Enterprise'].map((h) => (
              <th key={h} className="text-center py-3 font-mono text-xs uppercase" style={{ color: '#6C8EFF' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr
              key={row.feature}
              style={{ borderBottom: '1px solid rgba(108,142,255,0.08)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(108,142,255,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <td className="py-3" style={{ color: '#8B96C8' }}>{row.feature}</td>
              <td className="py-3 text-center">{row.oss ? <Check /> : <X />}</td>
              <td className="py-3 text-center">{row.seat ? <Check /> : <X />}</td>
              <td className="py-3 text-center">{row.app ? <Check /> : <X />}</td>
              <td className="py-3 text-center">{row.enterprise ? <Check /> : <X />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
