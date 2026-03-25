import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { ForbiddenError } from './errors';
import { CloudOptions } from './authenticator';

export interface RouteOptions {
  roles?: string[];
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

/**
 * Mirrors the real getRouterWrapper() pattern.
 *
 * Usage:
 *   const router = createRouter();
 *   router.get('/path', handler);                          // any authenticated user
 *   router.post('/path', handler, { roles: ['admin'] });   // admin only
 */
export function createRouter() {
  const router = Router();

  function wrap(handler: AsyncHandler, options?: RouteOptions): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (options?.roles && options.roles.length > 0) {
          const cloudOptions = res.locals.cloudOptions as CloudOptions;
          const hasRole = options.roles.some((r) => cloudOptions.roles.includes(r));
          if (!hasRole) {
            throw new ForbiddenError(
              `This action requires one of these roles: ${options.roles.join(', ')}`
            );
          }
        }
        await handler(req, res, next);
      } catch (err) {
        next(err);
      }
    };
  }

  return {
    router,
    get(path: string, handler: AsyncHandler, options?: RouteOptions) {
      router.get(path, wrap(handler, options));
      return this;
    },
    post(path: string, handler: AsyncHandler, options?: RouteOptions) {
      router.post(path, wrap(handler, options));
      return this;
    },
    patch(path: string, handler: AsyncHandler, options?: RouteOptions) {
      router.patch(path, wrap(handler, options));
      return this;
    },
    delete(path: string, handler: AsyncHandler, options?: RouteOptions) {
      router.delete(path, wrap(handler, options));
      return this;
    },
    use(path: string, middleware: Router) {
      router.use(path, middleware);
      return this;
    },
  };
}
