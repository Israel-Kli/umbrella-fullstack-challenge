import { Router } from 'express';
import { authenticator } from '../middlewares/authenticator';
import { grantChecker } from '../middlewares/grantChecker';
import organizationsRouter from '../organizations/organizations.router';

const v1Router = Router();

// Auth applied to all /api/v1 routes
v1Router.use(authenticator);

// Organizations — no grantChecker (operator-level, lists accessible orgs)
v1Router.use('/organizations', organizationsRouter);

// ─────────────────────────────────────────────────────────────────────────────
// All routes below require X-Customer-Organization-Id + a valid grant
// ─────────────────────────────────────────────────────────────────────────────
v1Router.use(grantChecker);

// TODO: mount your governance-tags router here, e.g.:
// import governanceTagsRouter from '../governance-tags/governance-tags.router';
// v1Router.use('/usage-cost-records', usageCostRecordsRouter);
// v1Router.use('/governance-tag-rules', governanceTagRulesRouter);
// v1Router.use('/governance-tagging', governanceTaggingRouter);
// v1Router.use('/allocation', allocationRouter);

export default v1Router;
