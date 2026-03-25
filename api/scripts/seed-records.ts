/**
 * Seeds usage cost records by POSTing sample-data/usage_cost_records.json
 * to the bulk ingest endpoint.
 *
 * Run AFTER implementing POST /api/v1/usage-cost-records/bulk
 *
 * Usage:
 *   MSP_ADMIN_TOKEN=<token> npm run seed:records
 *
 * The MSP_ADMIN_TOKEN is the token for msp_summit_finops / admin.
 * See sample-data/sample-tokens.md for pre-generated tokens.
 */
import axios from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const TOKEN = process.env.MSP_ADMIN_TOKEN;

if (!TOKEN) {
  console.error('MSP_ADMIN_TOKEN env variable is required');
  console.error('See sample-data/sample-tokens.md for pre-generated tokens');
  process.exit(1);
}

interface UsageCostRecord {
  customerOrganizationId: string;
  [key: string]: any;
}

interface SeedSummary {
  org: string;
  ingested?: number;
  deduplicated?: number;
  error?: string;
}

async function seedRecords() {
  const records: UsageCostRecord[] = JSON.parse(
    readFileSync(join(__dirname, '../../sample-data/usage_cost_records.json'), 'utf-8')
  );

  // Group records by customerOrganizationId (each org needs its own request + header)
  const byOrg: Record<string, UsageCostRecord[]> = {};
  for (const record of records) {
    const org = record.customerOrganizationId;
    if (!byOrg[org]) byOrg[org] = [];
    byOrg[org].push(record);
  }

  const results: SeedSummary[] = [];

  for (const [org, orgRecords] of Object.entries(byOrg)) {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/v1/usage-cost-records/bulk`,
        { items: orgRecords.map(({ customerOrganizationId, ...r }) => r) },
        {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            'X-Customer-Organization-Id': org,
            'Content-Type': 'application/json',
          },
        }
      );
      results.push({ org, ...response.data });
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.error?.message || err.message;
      results.push({ org, error: `${status}: ${message}` });
    }
  }

  console.log('\nSeed results:');
  for (const r of results) {
    if (r.error) {
      console.log(`  ✗ ${r.org}: ${r.error}`);
    } else {
      console.log(`  ✓ ${r.org}: ingested=${r.ingested}, deduplicated=${r.deduplicated}`);
    }
  }
}

seedRecords().catch(console.error);
