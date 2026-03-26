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

**3–4 focused hours.** AI tools (Copilot, Cursor, ChatGPT, Claude) are encouraged. We will discuss your design decisions, trade-offs, and how you validated security in the follow-up.

---

## Minimum viable submission

- **Phase 1 + Phase 2 backend working end-to-end**, with correct tenant isolation on every query
- **Phase 3 allocation endpoint** with currency conversion
- **One working frontend view** (Allocation Overview)

Bonus items improve your score but are not required.

---

## Phases

### Phase 1 — Ingestion

Implement `POST /api/v1/usage-cost-records/bulk`:
- Admin only
- All records stored with `organization_id` = `customerOrgId` from `res.locals.cloudOptions`
- Idempotent: re-ingesting a record with the same `(externalId, organizationId)` = deduplicated, not error
- **Apply governance tag rules on ingestion**: for each record, find the first matching enabled rule (ordered by `id`) and store `governance_tag_key`, `governance_tag_value`, `matched_rule_id`
- Response: `{ ingested: N, deduplicated: M }`

Also implement `GET /api/v1/usage-cost-records` (viewer/admin):
- Paginated, filterable by date range and governance tag
- Returns governance tag fields on each record

**Follow the pattern** in `src/organizations/` — router → controller → service → model. Every model query must include `WHERE organization_id = $1` with `this.customerOrgId`.

### Phase 2 — Governance Tag Rules CRUD

Implement CRUD for `governance_tag_rules`:

1. `GET /api/v1/governance-tag-rules` — list rules (viewer/admin)
2. `POST /api/v1/governance-tag-rules` — create rule (admin only)
3. `PATCH /api/v1/governance-tag-rules/:id` — update rule (admin only)
4. `POST /api/v1/governance-tag-rules/:id/disable` — disable rule (admin only)

**Rule matching logic** (applied during ingestion):
- `exact`: field value equals pattern exactly
- `contains`: field value contains pattern (case-insensitive)

First matching enabled rule wins (ordered by `id`). Only ONE rule is applied per record.

Note: 2 rules are pre-seeded for `cust_northwind_health` so you can test rule matching during ingestion.

### Phase 3 — Allocation Summary with Currency Normalization

Implement `GET /api/v1/allocation/summary`:
- Group cost totals by governance tag (`tagKey:tagValue`), with untagged records grouped separately
- When `baseCurrency` param is provided, convert all amounts using **historical exchange rates from [frankfurter.dev](https://api.frankfurter.dev) (v2 API)**

**Currency conversion requirements**:
- Use the rate for each record's `usageDate`, not today's rate
- Cache results in `exchange_rate_cache` table (rates are historical and don't change)
- If the API is unavailable, return a 502 error

### Frontend — Allocation Overview

Build one view: **Allocation Overview**
- Totals grouped by governance tag
- Currency normalization toggle (e.g., convert to USD)
- Loading, error, and empty states
- Current org context visible

```
┌─────────────────────────────────────────────────┐
│  Allocation Overview          [Org: Northwind ▾]│
├─────────────────────────────────────────────────┤
│  Base Currency: [USD ▾]                         │
│                                                 │
│  Group                    Amount    Records     │
│  ───────────────────────  ────────  ────────    │
│  CostCategory:Compute      $142.35       1      │
│  Lifecycle:Production       $24.77       1      │
│  untagged                    $0.00       0      │
│                                                 │
│                    Total:  $167.12       2      │
└─────────────────────────────────────────────────┘
```

The `OrgSwitcher` component and API client are pre-built in `src/components/OrgSwitcher.tsx` and `src/api/client.ts`.

---

## Bonus

These are optional. Pick any that interest you:

1. **Rules management view** — A second frontend page for governance tag rules. Admin can create/edit/disable rules; viewer sees a read-only list.
2. **Graceful degradation** — When frankfurter.dev is unavailable, return amounts in their original currency and include a `warnings` array in the allocation response instead of returning 502.
3. **Priority-based rule matching** — Higher `priority` number wins; tie-break by most recently updated rule. Add an `explainability` JSON field on each record showing which rule matched and why.

---

## Constraints

- No proprietary dependencies — public npm packages only
- No real IdP — the mock JWT system is already set up; use tokens from `sample-data/sample-tokens.md`
- Secrets in `.env` only

---

## Submission

1. Fork this repo and push your work to your **public fork**
2. Update `README.md` with:
   - Any additional setup steps
   - Design decisions and trade-offs
   - Which AI tools you used, and what you verified manually (especially around tenant isolation)
3. Include sample requests demonstrating each endpoint (curl commands or a Postman collection)

---

## Tips

- **Start with the organizations module** — read it thoroughly before writing any code
- **Test grant enforcement early** — use the CUSTOMER_VIEWER token with a different org to verify 403
- **Pre-seeded rules exist** for `cust_northwind_health` — test rule matching during ingestion
- **The trap record** in `sample-data/usage_cost_records.json` has `customerOrganizationId: "cust_unknown_corp"` — this org has no grant; ingesting it without a grant check is a tenant isolation violation
