export interface ApiEntry {
  name: string;
  type: string;
  description: string;
  params?: { name: string; type: string; desc: string }[];
}

export function ApiRefTable({ entries }: { entries: ApiEntry[] }) {
  return (
    <div className="flex flex-col gap-8">
      {entries.map((entry) => (
        <div
          key={entry.name}
          className="p-6 rounded-lg"
          style={{ border: '1px solid rgba(108,142,255,0.15)' }}>
          <div className="flex items-baseline gap-3 mb-2">
            <code
              className="font-mono font-bold text-base"
              style={{ color: '#6C8EFF' }}>
              {entry.name}
            </code>
            <code
              className="font-mono text-xs"
              style={{ color: '#8B96C8' }}>
              {entry.type}
            </code>
          </div>
          <p className="text-sm mb-4" style={{ color: '#8B96C8' }}>{entry.description}</p>
          {entry.params && entry.params.length > 0 && (
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(108,142,255,0.15)' }}>
                  {['Parameter', 'Type', 'Description'].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2 font-mono uppercase"
                      style={{ color: '#4A527A' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entry.params.map((p) => (
                  <tr key={p.name} style={{ borderBottom: '1px solid rgba(108,142,255,0.08)' }}>
                    <td className="py-2 font-mono" style={{ color: '#6C8EFF' }}>{p.name}</td>
                    <td className="py-2 font-mono" style={{ color: '#8B96C8' }}>{p.type}</td>
                    <td className="py-2" style={{ color: '#8B96C8' }}>{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
