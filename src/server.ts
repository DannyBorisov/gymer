import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: true
});

// Serve static files from the React build folder
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../frontend/dist'),
  prefix: '/'
});

// API routes
fastify.get('/api/health', async () => {
  return { status: 'ok' };
});

// Fallback to index.html for client-side routing
fastify.setNotFoundHandler(async (request, reply) => {
  return reply.sendFile('index.html');
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Server running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
