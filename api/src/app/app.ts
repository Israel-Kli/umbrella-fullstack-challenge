import express, { Express, Request, Response, NextFunction } from 'express';
import { errorsHandler } from '../middlewares/errorsHandler';
import { NotFoundError } from '../middlewares/errors';
import v1Router from './routes';

export async function createApp(): Promise<Express> {
  const app = express();

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS for local frontend dev
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Customer-Organization-Id');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Health check (no auth)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // API v1
  app.use('/api/v1', v1Router);

  // JSON 404 for unmatched routes
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError('Route not found'));
  });

  // Global error handler — must be last
  app.use(errorsHandler);

  return app;
}
