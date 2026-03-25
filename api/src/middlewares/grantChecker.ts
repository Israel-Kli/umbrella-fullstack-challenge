import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, BadRequestParamsError } from './errors';
import { CloudOptions } from './authenticator';

/**
 * Verifies that the operator org (from JWT) has a customer_access_grants row
 * allowing it to act on behalf of the customer org in the X-Customer-Organization-Id header.
 *
 * Sets res.locals.cloudOptions.customerOrgId on success.
 *
 * Routes that don't need a customer org context (e.g. listing accessible orgs)
 * should set skipGrantCheck: true in their route options.
 */
export async function grantChecker(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cloudOptions = res.locals.cloudOptions as CloudOptions;
    const customerOrgId = req.headers['x-customer-organization-id'] as string;

    if (!customerOrgId) {
      throw new BadRequestParamsError('X-Customer-Organization-Id header is required');
    }

    const result = await cloudOptions.pool.query(
      `SELECT 1 FROM customer_access_grants
       WHERE operator_organization_id = $1 AND customer_organization_id = $2`,
      [cloudOptions.operatorOrgId, customerOrgId]
    );

    if (result.rowCount === 0) {
      throw new ForbiddenError(
        `No customer_access_grants row for operator "${cloudOptions.operatorOrgId}" → customer "${customerOrgId}"`
      );
    }

    cloudOptions.customerOrgId = customerOrgId;
    next();
  } catch (err) {
    next(err);
  }
}
