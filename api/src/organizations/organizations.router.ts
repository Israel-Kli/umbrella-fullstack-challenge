import { createRouter } from '../middlewares/routerWrapper';
import { listOrganizations, getOrganization } from './organizations.controller';

/**
 * These routes do NOT need grantChecker — they operate on the operator's own
 * list of accessible orgs, not a specific customer org context.
 * No X-Customer-Organization-Id header required here.
 */
const { router, get } = createRouter();

// GET /api/v1/organizations — list all orgs this operator can access
get('/', listOrganizations);

// GET /api/v1/organizations/:id — get a single accessible org
get('/:id', getOrganization);

export default router;
