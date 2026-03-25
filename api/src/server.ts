import 'dotenv/config';
import { createApp } from './app/app';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function start() {
  const app = await createApp();
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
