import { Request, Response } from 'express';
import { OrganizationsService } from './organizations.service';
import { CloudOptions } from '../utils/Model';

export async function listOrganizations(req: Request, res: Response): Promise<void> {
  const service = new OrganizationsService(res.locals.cloudOptions as CloudOptions);
  const orgs = await service.listAccessibleOrgs();
  res.json({ items: orgs });
}

export async function getOrganization(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const service = new OrganizationsService(res.locals.cloudOptions as CloudOptions);
  const org = await service.getOrgById(id);
  res.json(org);
}
