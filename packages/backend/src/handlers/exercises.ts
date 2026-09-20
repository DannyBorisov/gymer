import type { RouteHandler } from "fastify";
import { prisma } from "../dal/index.js";

export const getExercises: RouteHandler = async function (_request, reply) {
  const exercises = await prisma.exercises.findAll();
  return reply.send({ exercises });
};
