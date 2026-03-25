-- Umbrella FinOps Challenge — PostgreSQL schema + seed data
-- Run via: npm run migrate

-- ─────────────────────────────────────────────────────────────────────────────
-- SCHEMA
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_access_grants (
  id                       BIGSERIAL PRIMARY KEY,
  operator_organization_id TEXT NOT NULL REFERENCES organizations(id),
  customer_organization_id TEXT NOT NULL REFERENCES organizations(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operator_organization_id, customer_organization_id)
);

CREATE TABLE IF NOT EXISTS app_users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  home_org_id TEXT NOT NULL REFERENCES organizations(id),
  role        TEXT NOT NULL CHECK (role IN ('viewer', 'admin'))
);

CREATE TABLE IF NOT EXISTS governance_tag_rules (
  id                BIGSERIAL PRIMARY KEY,
  organization_id   TEXT NOT NULL REFERENCES organizations(id),
  name              TEXT NOT NULL,
  match_type        TEXT NOT NULL CHECK (match_type IN ('exact', 'contains', 'regex')),
  field_name        TEXT NOT NULL,
  pattern           TEXT NOT NULL,
  target_tag_key    TEXT NOT NULL,
  target_tag_value  TEXT NOT NULL,
  priority          INT NOT NULL DEFAULT 100,
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- usage_cost_records: raw billing rows with optional denormalized governance output
CREATE TABLE IF NOT EXISTS usage_cost_records (
  id                  BIGSERIAL PRIMARY KEY,
  external_id         TEXT NOT NULL,
  organization_id     TEXT NOT NULL REFERENCES organizations(id),
  cloud_provider      TEXT NOT NULL,
  account_id          TEXT NOT NULL,
  service             TEXT NOT NULL,
  region              TEXT NOT NULL,
  usage_date          DATE NOT NULL,
  currency            TEXT NOT NULL,
  amount              NUMERIC(18, 6) NOT NULL,
  resource_id         TEXT NOT NULL,
  native_tags         JSONB NOT NULL DEFAULT '{}'::jsonb,
  governance_tag_key  TEXT,
  governance_tag_value TEXT,
  matched_rule_id     BIGINT REFERENCES governance_tag_rules(id),
  explainability      JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (external_id, organization_id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id              BIGSERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  actor_sub       TEXT NOT NULL,
  action          TEXT NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cache for frankfurter.dev exchange rates (keyed by date + currency pair)
CREATE TABLE IF NOT EXISTS exchange_rate_cache (
  id            BIGSERIAL PRIMARY KEY,
  rate_date     DATE NOT NULL,
  from_currency TEXT NOT NULL,
  to_currency   TEXT NOT NULL,
  rate          NUMERIC(18, 10) NOT NULL,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rate_date, from_currency, to_currency)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO organizations (id, name) VALUES
  ('cust_northwind_health',      'Northwind Health Systems'),
  ('cust_contoso_retail_eu',     'Contoso Retail Europe B.V.'),
  ('cust_tailspin_broadcasting', 'Tailspin Broadcasting Co.'),
  ('msp_summit_finops',          'Summit FinOps Partners')
ON CONFLICT (id) DO NOTHING;

-- Grants: MSP can access all 3 customers; each customer can access itself
INSERT INTO customer_access_grants (operator_organization_id, customer_organization_id) VALUES
  ('msp_summit_finops',          'cust_northwind_health'),
  ('msp_summit_finops',          'cust_contoso_retail_eu'),
  ('msp_summit_finops',          'cust_tailspin_broadcasting'),
  ('cust_northwind_health',      'cust_northwind_health'),
  ('cust_contoso_retail_eu',     'cust_contoso_retail_eu'),
  ('cust_tailspin_broadcasting', 'cust_tailspin_broadcasting')
ON CONFLICT (operator_organization_id, customer_organization_id) DO NOTHING;

INSERT INTO app_users (id, email, home_org_id, role) VALUES
  ('u-admin-msp',       'finops.eng@summitfinops.example',       'msp_summit_finops',      'admin'),
  ('u-nh-viewer',       'cloud.viewer@northwindhealth.example',  'cust_northwind_health',  'viewer'),
  ('u-contoso-admin',   'platform.admin@contoso-retail.example', 'cust_contoso_retail_eu', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Pre-seeded rules so you can test re-apply without building CRUD first
INSERT INTO governance_tag_rules
  (organization_id, name, match_type, field_name, pattern, target_tag_key, target_tag_value, priority, enabled)
VALUES
  ('cust_northwind_health', 'Tag EC2 as Compute',
   'exact', 'service', 'AmazonEC2', 'CostCategory', 'Compute', 200, true),
  ('cust_northwind_health', 'Tag production resources',
   'contains', 'native_tags', 'production', 'Lifecycle', 'Production', 100, true),
  ('cust_contoso_retail_eu', 'Tag Azure VMs as Compute',
   'contains', 'service', 'virtualMachines', 'CostCategory', 'Compute', 200, true)
ON CONFLICT DO NOTHING;
