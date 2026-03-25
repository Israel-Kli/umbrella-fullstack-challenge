# Sample JWT Tokens

All tokens are signed with `JWT_SECRET=super-secret-challenge-key-change-in-prod`
(configured in `api/.env.example`).

Tokens expire in 1 year from repo creation (2027-03-21).
To decode any token, paste it at [jwt.io](https://jwt.io) with the secret above.

---

## MSP_ADMIN_TOKEN

**Who**: `u-admin-msp` — Summit FinOps Partners MSP, admin role
**Can access**: All 3 customer orgs (via grants)
**Use for**: Ingesting records, managing rules, re-apply, full admin flow

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1LWFkbWluLW1zcCIsIm9yZ0lkIjoibXNwX3N1bW1pdF9maW5vcHMiLCJyb2xlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NzQ0NzA2MzYsImV4cCI6MTgwNjAwNjYzNn0.qEDQSbynLGB_1vtaTMeRW7s85npuzIwh01tlp_FyP2g
```

Example request:
```bash
curl -H "Authorization: Bearer <token above>" \
     -H "X-Customer-Organization-Id: cust_northwind_health" \
     http://localhost:3001/api/v1/usage-cost-records
```

---

## CUSTOMER_VIEWER_TOKEN

**Who**: `u-nh-viewer` — Northwind Health Systems, viewer role
**Can access**: `cust_northwind_health` only (no cross-org access)
**Use for**: Read-only endpoints; expect 403 on admin-only routes; expect 403 if header is a different org

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1LW5oLXZpZXdlciIsIm9yZ0lkIjoiY3VzdF9ub3J0aHdpbmRfaGVhbHRoIiwicm9sZXMiOlsidmlld2VyIl0sImlhdCI6MTc3NDQ3MDYzNiwiZXhwIjoxODA2MDA2NjM2fQ.uoSdCb0eqcvyTRoR5MJYjvczj7v8zA0cIeNwnEG6CPQ
```

---

## CUSTOMER_ADMIN_TOKEN

**Who**: `u-contoso-admin` — Contoso Retail Europe, admin role
**Can access**: `cust_contoso_retail_eu` only
**Use for**: Testing that customer admins can manage their own org's rules

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1LWNvbnRvc28tYWRtaW4iLCJvcmdJZCI6ImN1c3RfY29udG9zb19yZXRhaWxfZXUiLCJyb2xlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NzQ0NzA2MzYsImV4cCI6MTgwNjAwNjYzNn0.vOPiK5RhCyagTC2jEFq02-YeOkGz9TLNy9TINNfq5fg
```

---

## Negative Test Cases

These should always return **403 Forbidden**:

| Scenario | Token | X-Customer-Organization-Id | Why 403 |
|----------|-------|--------------------------|---------|
| Wrong org for viewer | CUSTOMER_VIEWER | `cust_contoso_retail_eu` | Viewer's org has no grant for Contoso |
| No grant for trap org | MSP_ADMIN | `cust_unknown_corp` | No grant row exists for this org |
| Cross-customer access | CUSTOMER_ADMIN | `cust_northwind_health` | Contoso admin can't access Northwind |

---

## Generate Your Own Tokens

If you need a custom token for testing:

```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { sub: 'my-user', orgId: 'msp_summit_finops', roles: ['admin'] },
  'super-secret-challenge-key-change-in-prod',
  { expiresIn: '1h' }
);
console.log(token);
```
