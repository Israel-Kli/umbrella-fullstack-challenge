import { OrganizationsModel } from './organizations.model';
import { NotFoundError } from '../middlewares/errors';
import { CloudOptions } from '../utils/Model';

export class OrganizationsService {
  private model: OrganizationsModel;

  constructor(cloudOptions: CloudOptions) {
    this.model = new OrganizationsModel(cloudOptions);
  }

  async listAccessibleOrgs() {
    return this.model.listAccessibleOrgs();
  }

  async getOrgById(orgId: string) {
    const org = await this.model.getOrgById(orgId);
    if (!org) {
      throw new NotFoundError(`Organization "${orgId}" not found or not accessible`);
    }
    return org;
  }
}
