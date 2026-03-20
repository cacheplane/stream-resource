'use client';
import { useState } from 'react';

export function LeadForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(108,142,255,0.04)',
    border: '1px solid rgba(108,142,255,0.15)',
    color: '#EEF1FF',
    borderRadius: '6px',
    padding: '10px 14px',
    width: '100%',
    fontFamily: 'var(--font-sans)',
    fontSize: '14px',
    outline: 'none',
  };

  return (
    <section id="lead-form" className="px-8 py-16 max-w-xl mx-auto">
      <p className="font-mono text-xs uppercase tracking-widest mb-8 text-center" style={{ color: '#6C8EFF' }}>Enterprise</p>
      <h2
        style={{
          fontFamily: 'var(--font-garamond)',
          fontWeight: 700,
          fontSize: 'clamp(24px, 3vw, 36px)',
          color: '#EEF1FF',
          textAlign: 'center',
          marginBottom: 32,
        }}>
        Need volume seats or a custom contract?
      </h2>
      {status === 'sent' ? (
        <p className="text-center" style={{ color: '#8B96C8' }}>Thanks — we&apos;ll be in touch within one business day.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            name="name"
            placeholder="Name"
            required
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = '#6C8EFF'; e.target.style.outline = '2px solid rgba(108,142,255,0.4)'; e.target.style.outlineOffset = '2px'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(108,142,255,0.15)'; e.target.style.outline = 'none'; }}
          />
          <input
            name="email"
            type="email"
            placeholder="Work email"
            required
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = '#6C8EFF'; e.target.style.outline = '2px solid rgba(108,142,255,0.4)'; e.target.style.outlineOffset = '2px'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(108,142,255,0.15)'; e.target.style.outline = 'none'; }}
          />
          <input
            name="company"
            placeholder="Company"
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = '#6C8EFF'; e.target.style.outline = '2px solid rgba(108,142,255,0.4)'; e.target.style.outlineOffset = '2px'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(108,142,255,0.15)'; e.target.style.outline = 'none'; }}
          />
          <textarea
            name="message"
            placeholder="Tell us about your use case"
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
            onFocus={(e) => { e.target.style.borderColor = '#6C8EFF'; e.target.style.outline = '2px solid rgba(108,142,255,0.4)'; e.target.style.outlineOffset = '2px'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(108,142,255,0.15)'; e.target.style.outline = 'none'; }}
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            style={{
              background: '#6C8EFF',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 24px',
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              cursor: status === 'sending' ? 'not-allowed' : 'pointer',
              opacity: status === 'sending' ? 0.6 : 1,
              transition: 'box-shadow 0.2s',
            }}
            onMouseEnter={(e) => { if (status !== 'sending') e.currentTarget.style.boxShadow = '0 0 16px rgba(108,142,255,0.4)'; }}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}>
            {status === 'sending' ? 'Sending…' : 'Get in touch'}
          </button>
          {status === 'error' && (
            <p className="text-sm text-center" style={{ color: '#FF6B6B' }}>
              Something went wrong — try again or email us directly.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
