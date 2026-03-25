import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { UnauthorizedError } from './errors';
import { getPool } from '../app/db';

export interface CloudOptions {
  operatorOrgId: string;
  customerOrgId: string | null; // set by grantChecker middleware
  userSub: string;
  roles: string[];
  pool: ReturnType<typeof getPool>;
  requestId: string;
}

interface JwtPayload {
  sub: string;
  orgId: string;
  roles: string[];
}

export function authenticator(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const payload = jwt.verify(token, secret) as JwtPayload;

    if (!payload.sub || !payload.orgId || !Array.isArray(payload.roles)) {
      throw new UnauthorizedError('Token missing required claims: sub, orgId, roles');
    }

    res.locals.cloudOptions = {
      operatorOrgId: payload.orgId,
      customerOrgId: null,
      userSub: payload.sub,
      roles: payload.roles,
      pool: getPool(),
      requestId: randomUUID(),
    } as CloudOptions;

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      next(err);
    } else {
      next(new UnauthorizedError('Invalid or expired token'));
    }
  }
}
