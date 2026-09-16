import type { RouteHandler } from "fastify";
import { z } from "zod";
import { getAuthSession } from "../middlewares/auth.js";
import { prisma, Gender, Goal, ExperienceLevel } from "../dal/index.js";

const OnboardingBody = z.object({
  weight: z.number().positive(),
  height: z.number().positive(),
  age: z.number().int().positive(),
  gender: z.nativeEnum(Gender),
  goal: z.nativeEnum(Goal),
  experienceLevel: z.nativeEnum(ExperienceLevel),
  isComplete: z.boolean().default(true),
});

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

export const saveOnboarding: RouteHandler = async function (request, reply) {
  const email = requireEmail(request);
  if (!email) return reply.status(401).send({ error: "Not authenticated" });

  const parsed = OnboardingBody.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.issues[0].message });
  }

  const onboarding = await prisma.onboarding.upsert(email, parsed.data);
  return reply.send({ onboarding });
};
