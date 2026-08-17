import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

// Shared chrome for /privacy and /terms. Both are reachable logged-out on
// purpose: Google's OAuth consent screen links to them publicly, and someone
// deciding whether to sign up needs to read them before they have an account.
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="screen" style={{ overflowY: 'auto' }}>
      <div className="topnav">
        <button className="icon-btn back" onClick={() => navigate(-1)} aria-label="Back">
          <i className="hgi-stroke hgi-arrow-left-01" />
        </button>
        <span className="title">{title}</span>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-5)', textAlign: 'center', marginTop: 2 }}>
        Last updated {updated}
      </div>

      <div style={{ paddingBottom: 32 }}>{children}</div>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 26 }}>
      <h2
        style={{
          fontFamily: 'var(--font-head)',
          fontWeight: 600,
          fontSize: 15,
          color: 'var(--text-1)',
          margin: '0 0 8px'
        }}
      >
        {heading}
      </h2>
      <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-2)' }}>{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        marginTop: 12,
        background: 'var(--panel)',
        border: '1px solid rgba(124,110,246,.28)',
        borderRadius: 14,
        padding: '12px 14px',
        fontSize: 12.5,
        lineHeight: 1.6,
        color: 'var(--text-2)'
      }}
    >
      {children}
    </div>
  );
}

// One place to change the address that appears on both documents.
export const CONTACT_EMAIL = 'support@far2ad.space';
