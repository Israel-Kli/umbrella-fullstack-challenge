import React, { useEffect, useState } from 'react';
import client from '../api/client';

interface Organization {
  id: string;
  name: string;
}

interface OrgSwitcherProps {
  onOrgChange?: (orgId: string) => void;
}

/**
 * Fetches the list of orgs accessible to the current operator (via grants)
 * and lets the user switch between them.
 *
 * Stores the selected org in localStorage as 'customerOrgId'.
 * The axios client picks this up automatically on every request.
 */
export function OrgSwitcher({ onOrgChange }: OrgSwitcherProps) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selected, setSelected] = useState<string>(
    localStorage.getItem('customerOrgId') || ''
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Org list doesn't need X-Customer-Organization-Id header
    client.get<{ items: Organization[] }>('/organizations')
      .then((res) => {
        setOrgs(res.data.items);
        if (!selected && res.data.items.length > 0) {
          const firstOrg = res.data.items[0].id;
          setSelected(firstOrg);
          localStorage.setItem('customerOrgId', firstOrg);
          onOrgChange?.(firstOrg);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Failed to load organizations');
      })
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const orgId = e.target.value;
    setSelected(orgId);
    localStorage.setItem('customerOrgId', orgId);
    onOrgChange?.(orgId);
  }

  if (loading) return <span style={{ fontSize: 13, color: '#888' }}>Loading orgs…</span>;
  if (error) return <span style={{ fontSize: 13, color: '#c00' }}>{error}</span>;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={{ fontSize: 13, fontWeight: 600 }}>Customer org:</label>
      <select
        value={selected}
        onChange={handleChange}
        style={{ fontSize: 13, padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc' }}
      >
        {orgs.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </div>
  );
}
