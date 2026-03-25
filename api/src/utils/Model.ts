import { Pool, QueryResult } from 'pg';

export interface CloudOptions {
  operatorOrgId: string;
  customerOrgId: string;
  userSub: string;
  roles: string[];
  pool: Pool;
  requestId: string;
}

/**
 * Base model class — mirrors the real frontend-app-server Model pattern.
 *
 * Every subclass MUST scope ALL queries to `this.customerOrgId`.
 * Failing to do so is a tenant isolation violation.
 *
 * Example:
 *   await this.query(
 *     'SELECT * FROM my_table WHERE organization_id = $1',
 *     [this.customerOrgId]
 *   );
 */
export abstract class Model {
  protected customerOrgId: string;
  protected operatorOrgId: string;
  protected userSub: string;
  protected pool: Pool;

  constructor(cloudOptions: CloudOptions) {
    this.customerOrgId = cloudOptions.customerOrgId;
    this.operatorOrgId = cloudOptions.operatorOrgId;
    this.userSub = cloudOptions.userSub;
    this.pool = cloudOptions.pool;
  }

  protected async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }
}
