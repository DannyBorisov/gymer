import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildApp } from "../src/app.js";

let app: ReturnType<typeof buildApp> | null = null;

async function getApp() {
  if (!app) {
    app = buildApp();
    await app.ready();
  }
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const fastify = await getApp();

  // Inject the request into Fastify
  const response = await fastify.inject({
    method: req.method as any,
    url: req.url || "/",
    headers: req.headers as any,
    payload: req.body,
  });

  // Copy headers
  for (const [key, value] of Object.entries(response.headers)) {
    if (value) {
      res.setHeader(key, value);
    }
  }

  // Send response
  res.status(response.statusCode).send(response.payload);
}
