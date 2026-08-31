import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { createGSQL } from "../dal/index.js";

export const getBodyWeight: RouteHandler = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const gsql = createGSQL(tokens, this.sheets);
  const entries = await gsql.bodyWeight.findAll({ orderBy: { date: "asc" } });
  return reply.send({ entries });
};

export const saveBodyWeight: RouteHandler<{
  Body: { weight: number };
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);

  if (!request.body.weight) {
    return reply.status(400).send({ error: "Weight is required" });
  }

  const gsql = createGSQL(tokens, this.sheets);
  await gsql.bodyWeight.create({ weight: request.body.weight });
  return { success: true };
};
