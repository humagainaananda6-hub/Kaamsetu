import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { getDb } from './src/server/db.ts';
import { seedDatabaseIfEmpty } from './src/server/seed.ts';
import { createApiRouter } from './src/server/routes.ts';

async function startServer() {
  getDb();
  seedDatabaseIfEmpty();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '8mb' }));
  app.use('/api', createApiRouter());
  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('API Error:', err);
    if (res.headersSent) return;
    res.status(err?.status || 500).json({ error: err?.message || 'Internal server error.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KaamSetu server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start KaamSetu server:', err);
  process.exit(1);
});
