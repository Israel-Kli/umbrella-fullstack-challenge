import React, { useState, useEffect } from 'react';
import { OrgSwitcher } from './components/OrgSwitcher';

/**
 * App shell — pre-configured with:
 *   - Token setup UI (paste your JWT from sample-data/sample-tokens.md)
 *   - OrgSwitcher component (pre-built, calls GET /api/v1/organizations)
 *   - Placeholder area for your views
 *
 * Add your pages under src/pages/ and link them here.
 */

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [tokenSaved, setTokenSaved] = useState(!!localStorage.getItem('token'));
  const [currentOrg, setCurrentOrg] = useState(localStorage.getItem('customerOrgId') || '');

  function saveToken() {
    const trimmed = token.trim();
    if (!trimmed) return;
    localStorage.setItem('token', trimmed);
    setTokenSaved(true);
    window.location.reload();
  }

  function clearSession() {
    localStorage.clear();
    setToken('');
    setTokenSaved(false);
    setCurrentOrg('');
  }

  if (!tokenSaved) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Umbrella FinOps Challenge</h1>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
            Paste a JWT from <code>sample-data/sample-tokens.md</code> to get started.
          </p>
          <textarea
            style={styles.tokenInput}
            placeholder="Paste JWT token here..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            rows={4}
          />
          <button onClick={saveToken} style={styles.button}>
            Set Token
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Umbrella FinOps</span>
        <OrgSwitcher onOrgChange={(orgId) => setCurrentOrg(orgId)} />
        <button onClick={clearSession} style={styles.buttonSmall}>
          Clear session
        </button>
      </header>

      <nav style={styles.nav}>
        {/* Add links to your views here, e.g.: */}
        {/* <a href="/rules">Governance Rules</a> */}
        {/* <a href="/allocation">Allocation</a> */}
        <span style={{ color: '#888', fontSize: 13 }}>
          Add navigation links to your views here (src/App.tsx)
        </span>
      </nav>

      <main style={styles.main}>
        <div style={styles.placeholder}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Ready to build</h2>
          <p style={{ fontSize: 14, color: '#555' }}>
            Current org: <strong>{currentOrg || 'none selected'}</strong>
          </p>
          <p style={{ fontSize: 13, color: '#888', marginTop: 12 }}>
            Add your pages under <code>src/pages/</code> and link them in the nav above.
          </p>
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loginContainer: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '100vh', padding: 24,
  },
  loginCard: {
    background: '#fff', borderRadius: 8, padding: 32, maxWidth: 480, width: '100%',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  tokenInput: {
    width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8,
    border: '1px solid #ccc', borderRadius: 4, resize: 'vertical', marginBottom: 12,
  },
  button: {
    background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4,
    padding: '8px 20px', fontSize: 14, cursor: 'pointer',
  },
  buttonSmall: {
    background: 'transparent', color: '#666', border: '1px solid #ccc',
    borderRadius: 4, padding: '4px 12px', fontSize: 12, cursor: 'pointer',
  },
  appContainer: { display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  header: {
    display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px',
    background: '#fff', borderBottom: '1px solid #e5e7eb',
  },
  nav: {
    padding: '8px 24px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
    display: 'flex', gap: 16,
  },
  main: { flex: 1, padding: 24 },
  placeholder: {
    background: '#fff', borderRadius: 8, padding: 32, maxWidth: 600,
    border: '2px dashed #d1d5db', textAlign: 'center',
  },
};
