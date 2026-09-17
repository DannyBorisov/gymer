import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { prisma } from "../dal/index.js";
import {
  SaveOnboardingBodySchema,
  type SaveOnboardingBodyType,
} from "../schemas/onboarding.js";

function requireEmail(request: Parameters<RouteHandler>[0]): string | null {
  const { user } = getAuthSession(request);
  return user?.email ?? null;
}

export const getOnboarding: RouteHandler = async function (request, reply) {
  const email = requireEmail(request);
  if (!email) return reply.status(401).send({ error: "Not authenticated" });

  const onboarding = await prisma.onboarding.get(email);
  return reply.send({ onboarding });
};

export const saveOnboarding: RouteHandler<{
  Body: SaveOnboardingBodyType;
}> = async function (request, reply) {
  const email = requireEmail(request);
  if (!email) return reply.status(401).send({ error: "Not authenticated" });

  const parsed = SaveOnboardingBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.issues[0].message });
  }

  const onboarding = await prisma.onboarding.upsert(email, parsed.data);
  return reply.send({ onboarding });
};
