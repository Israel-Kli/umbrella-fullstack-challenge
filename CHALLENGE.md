# Umbrella FinOps — Fullstack Challenge

## What you're building

You'll extend a working Express + React starter app with a **cost governance tagging feature** — the kind of feature we build every day at Umbrella.

The system is a **multi-tenant FinOps platform** where:
- An **operator org** (e.g., an MSP like Summit FinOps) can access data for multiple **customer orgs** it manages
- All data is strictly scoped to a single customer organization per request
- Access is controlled by `customer_access_grants` rows in the database

The starter app already has:
- Express + TypeScript server with authentication and grant enforcement middleware
- `Model` base class for database access with org scoping pattern
- A pre-built `organizations` module as a reference implementation
- React frontend with org switcher and pre-configured API client

**Your job**: implement the governance tagging feature in this existing codebase, following the established patterns.

---

## Context: what is governance tagging?

Cloud providers give resources native tags (e.g., `Environment: production`, `CostCenter: CC-Platform-Eng`). These are inconsistent across providers and teams.

**Governance tags** are normalized business labels derived from rules: "if this record's service is AmazonEC2, tag it as CostCategory=Compute." This lets finance teams allocate costs to business units regardless of which cloud provider billed them.

---

## Target effort

**One focused business day.** AI tools (Copilot, Cursor, ChatGPT, Claude) are encouraged. We will discuss your design decisions, trade-offs, and how you validated security in the follow-up.

---

## Minimum viable submission (what constitutes a passing submission)

- **Phase 1 + Phase 2 backend working end-to-end**, with correct tenant isolation on every query
- One working frontend view

Everything beyond that improves your score.

---

## Phases

### Phase 1 — Ingestion

Implement `POST /api/v1/usage-cost-records/bulk`:
- Admin only
- All records stored with `organization_id` = `customerOrgId` from `res.locals.cloudOptions`
- Idempotent: re-ingesting a record with the same `(externalId, organizationId)` = deduplicated, not error
- Response: `{ ingested: N, deduplicated: M }`

Also implement `GET /api/v1/usage-cost-records` (viewer/admin):
- Paginated, filterable by date range and governance tag
- Returns governance tag + explainability fields on each record

**Follow the pattern** in `src/organizations/` — router → controller → service → model. Every model query must include `WHERE organization_id = $1` with `this.customerOrgId`.

### Phase 2 — Governance Tag Rule Engine

Implement CRUD for `governance_tag_rules` and the re-apply operation:

1. `GET /api/v1/governance-tag-rules` — list rules; `POST /api/v1/governance-tag-rules` — create rule
2. `PATCH /api/v1/governance-tag-rules/:id` — update
3. `POST /api/v1/governance-tag-rules/:id/disable` — disable (admin only)
4. `POST /api/v1/governance-tagging/reapply` — apply rules to records in a date range

**Rule matching logic**:
- `exact`: field value equals pattern exactly
- `contains`: field value contains pattern (case-insensitive)
- `regex`: field value matches as a regular expression

**Priority**: higher `priority` number wins. Tie-break: most recently updated rule.

When a rule matches, store: `governance_tag_key`, `governance_tag_value`, `matched_rule_id`, and an `explainability` JSON object explaining which rule matched and why.

Note: 2 rules are pre-seeded for `cust_northwind_health` so you can test re-apply without building CRUD first.

### Phase 3 — Allocation Summary with Currency Normalization

Implement `GET /api/v1/allocation/summary`:
- Group cost totals by governance tag dimension
- Surface untagged totals separately
- When `baseCurrency` param is provided, convert all amounts using **historical exchange rates from [frankfurter.dev](https://api.frankfurter.dev) (v2 API)**

**Currency conversion requirements**:
- Use the rate for each record's `usageDate`, not today's rate
- Cache results in `exchange_rate_cache` table (rates are historical and don't change)
- Do NOT make one API call per record — batch by unique (date, currency) pairs
- If the API is unavailable, return amounts in original currency and include a `warnings` array in the response

### Frontend — 2 Views

1. **Governance Tag Rules** — list rules, create/edit form (admin), disable button (admin), viewer sees read-only
2. **Allocation Overview** — totals grouped by governance tag, with currency normalization toggle, loading/error/empty states, org context visible

The `OrgSwitcher` component and API client are pre-built in `src/components/OrgSwitcher.tsx` and `src/api/client.ts`.

---

## Constraints

- No proprietary dependencies — public npm packages only
- No real IdP — the mock JWT system is already set up; use tokens from `sample-data/sample-tokens.md`
- Secrets in `.env` only

---

## Submission

1. GitHub repo (or zip) with `api/` + `web/` + your code
2. `README.md` updates:
   - Any additional setup steps
   - Design decisions and trade-offs
   - Which AI tools you used, and what you verified manually (especially around tenant isolation)
3. Sample requests demonstrating each endpoint (curl commands or a Postman collection)

---

## Tips

- **Start with the organizations module** — read it thoroughly before writing any code
- **Test grant enforcement early** — use the CUSTOMER_VIEWER token with a different org to verify 403
- **Pre-seeded rules exist** for `cust_northwind_health` — test re-apply before building CRUD
- **The trap record** in `sample-data/usage_cost_records.json` has `customerOrganizationId: "cust_unknown_corp"` — this org has no grant; ingesting it without a grant check is a tenant isolation violation
- Run `npm audit` in the `api/` directory at some point
