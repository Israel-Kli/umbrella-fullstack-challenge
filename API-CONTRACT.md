# API Contract

## Auth model

Every request requires:
- `Authorization: Bearer <jwt>` — JWT signed with `JWT_SECRET`
- `X-Customer-Organization-Id: <org_id>` — the customer org you are acting on

JWT claims:
```json
{ "sub": "string", "orgId": "string", "roles": ["viewer"|"admin"] }
```

The server verifies a `customer_access_grants` row allows `orgId → X-Customer-Organization-Id`.

**Exception**: `GET /api/v1/organizations` does NOT require `X-Customer-Organization-Id`.

---

## Pre-built endpoints

### List accessible organizations

```
GET /api/v1/organizations
Authorization: Bearer <jwt>
```

Response:
```json
{
  "items": [
    { "id": "cust_northwind_health", "name": "Northwind Health Systems" },
    { "id": "cust_contoso_retail_eu", "name": "Contoso Retail Europe B.V." }
  ]
}
```

---

## Endpoints to implement

### 1. Ingest usage cost records (bulk)

```
POST /api/v1/usage-cost-records/bulk
Authorization: Bearer <jwt>   (role: admin)
X-Customer-Organization-Id: cust_northwind_health
```

Request body:
```json
{
  "items": [
    {
      "externalId": "834692381947-20260301-RunRate-EC2-8f3a",
      "cloudProvider": "aws",
      "accountId": "834692381947",
      "service": "AmazonEC2",
      "region": "us-east-1",
      "usageDate": "2026-03-01",
      "currency": "USD",
      "amount": 142.35,
      "resourceId": "arn:aws:ec2:us-east-1:...",
      "nativeTags": { "Environment": "production", "CostCenter": "CC-Platform-Eng" }
    }
  ]
}
```

Response `200`:
```json
{ "ingested": 1, "deduplicated": 0 }
```

- Role: `admin` only
- Idempotent on `(externalId, organizationId)` — re-ingesting same record counts as deduplicated
- All records stored with `organization_id = X-Customer-Organization-Id`

---

### 2. List usage cost records

```
GET /api/v1/usage-cost-records?from=2026-03-01&to=2026-03-31&page=1&pageSize=20
Authorization: Bearer <jwt>   (role: viewer or admin)
X-Customer-Organization-Id: cust_northwind_health
```

Optional query params: `from`, `to`, `governanceTagKey`, `governanceTagValue`, `page`, `pageSize`

Response `200`:
```json
{
  "items": [
    {
      "id": 1,
      "externalId": "834692381947-20260301-RunRate-EC2-8f3a",
      "cloudProvider": "aws",
      "service": "AmazonEC2",
      "usageDate": "2026-03-01",
      "currency": "USD",
      "amount": 142.35,
      "governanceTagKey": "CostCategory",
      "governanceTagValue": "Compute",
      "matchedRuleId": 1,
      "explainability": {
        "ruleName": "Tag EC2 as Compute",
        "matchType": "exact",
        "fieldName": "service",
        "pattern": "AmazonEC2"
      }
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

---

### 3. Governance tag rules CRUD

```
GET    /api/v1/governance-tag-rules                    (viewer or admin)
POST   /api/v1/governance-tag-rules                    (admin only)
PATCH  /api/v1/governance-tag-rules/:id                (admin only)
POST   /api/v1/governance-tag-rules/:id/disable        (admin only)
```

Rule shape:
```json
{
  "id": 1,
  "name": "Tag EC2 as Compute",
  "matchType": "exact",
  "fieldName": "service",
  "pattern": "AmazonEC2",
  "targetTagKey": "CostCategory",
  "targetTagValue": "Compute",
  "priority": 200,
  "enabled": true,
  "updatedAt": "2026-03-01T00:00:00Z"
}
```

`matchType` values:
- `exact` — field value equals pattern exactly
- `contains` — field value contains pattern (case-insensitive)
- `regex` — field value matches pattern as a regular expression

`fieldName` may reference: `service`, `region`, `cloudProvider`, `accountId`, or `native_tags` (match against JSON string representation)

**Priority**: Higher number wins. Tie-break: most recently updated rule wins. Only ONE rule is applied per record.

---

### 4. Re-apply governance rules

```
POST /api/v1/governance-tagging/reapply
Authorization: Bearer <jwt>   (role: admin)
X-Customer-Organization-Id: cust_northwind_health
```

Request body:
```json
{ "from": "2026-03-01", "to": "2026-03-31" }
```

Response `200` (synchronous, acceptable for small date ranges):
```json
{ "updatedRecordCount": 6 }
```

Applies all enabled rules to all matching records in the date range, in priority order. Updates `governance_tag_key`, `governance_tag_value`, `matched_rule_id`, and `explainability` on each record.

---

### 5. Allocation summary

```
GET /api/v1/allocation/summary?from=2026-03-01&to=2026-03-31&groupBy=governanceTagKey&baseCurrency=USD
Authorization: Bearer <jwt>   (viewer or admin)
X-Customer-Organization-Id: cust_northwind_health
```

Query params:
- `from`, `to` — date range (required)
- `groupBy` — dimension to group by (`governanceTagKey`, `service`, `region`)
- `baseCurrency` — target currency for normalization (optional, default: no conversion)

Response `200`:
```json
{
  "baseCurrency": "USD",
  "items": [
    { "group": "CostCategory:Compute",    "totalAmount": 142.35, "recordCount": 1 },
    { "group": "CostCategory:Production", "totalAmount": 24.77,  "recordCount": 1 },
    { "group": "untagged",                "totalAmount": 0.00,   "recordCount": 0 }
  ],
  "warnings": []
}
```

**Currency conversion**: Use [frankfurter.dev](https://api.frankfurter.dev) (v2) for historical exchange rates.
- `GET https://api.frankfurter.dev/v2/rate/{from}/{to}/{date}`
- Example: `GET https://api.frankfurter.dev/v2/rate/EUR/USD/2026-03-03`
- Response: `{"date":"2026-03-03","base":"EUR","quote":"USD","rate":1.1656}`
- `rate` is the multiplier: `converted = original_amount * rate`
- Cache rates in `exchange_rate_cache` table — historical rates don't change
- If the API is unavailable, return amounts in original currencies and include a warning:
  ```json
  { "warnings": ["Exchange rates unavailable; amounts shown in original currencies"] }
  ```
- Do NOT make one API call per record — batch by unique (date, currency) pairs

---

## Error shape

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "No customer_access_grants row for operator \"msp_summit_finops\" → customer \"cust_unknown_corp\""
  }
}
```

Common codes: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `BAD_REQUEST` (400), `INTERNAL_SERVER_ERROR` (500)
