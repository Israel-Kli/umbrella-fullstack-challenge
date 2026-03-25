import { Model, CloudOptions } from '../utils/Model';

export interface Organization {
  id: string;
  name: string;
}

export class OrganizationsModel extends Model {
  constructor(cloudOptions: CloudOptions) {
    super(cloudOptions);
  }

  /**
   * Returns all customer organizations that the operator org has access to.
   * Uses operatorOrgId (not customerOrgId) — this is one of the few queries
   * that is scoped to the operator rather than a specific customer.
   */
  async listAccessibleOrgs(): Promise<Organization[]> {
    const result = await this.query<Organization>(
      `SELECT o.id, o.name
       FROM organizations o
       JOIN customer_access_grants g ON g.customer_organization_id = o.id
       WHERE g.operator_organization_id = $1
       ORDER BY o.name`,
      [this.operatorOrgId]
    );
    return result.rows;
  }

  /**
   * Returns a single org by id, only if the operator has an access grant for it.
   */
  async getOrgById(orgId: string): Promise<Organization | null> {
    const result = await this.query<Organization>(
      `SELECT o.id, o.name
       FROM organizations o
       JOIN customer_access_grants g ON g.customer_organization_id = o.id
       WHERE g.operator_organization_id = $1 AND o.id = $2`,
      [this.operatorOrgId, orgId]
    );
    return result.rows[0] ?? null;
  }
}
