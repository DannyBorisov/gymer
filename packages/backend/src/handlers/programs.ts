import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import type { CreateProgramRequest, UpdateProgramRequest } from "../types.js";
import { createGSQL } from "../dal/index.js";

export const createProgram: RouteHandler<{
  Body: CreateProgramRequest;
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);

  const gsql = createGSQL(tokens, this.sheets);
  const program = await gsql.programs.create({
    name: request.body.name,
    durationWeeks: request.body.durationWeeks,
    dynamicRir: request.body.dynamicRir,
    startingRir: request.body.startingRir,
    workouts: request.body.workouts,
    frequency: request.body.frequency,
  });
  return { success: true, program };
};

export const listPrograms: RouteHandler = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const gsql = createGSQL(tokens, this.sheets);
  const programs = await gsql.programs.findAll();
  return { programs };
};

export const getProgram: RouteHandler<{
  Params: { id: string };
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { id } = request.params;

  try {
    const gsql = createGSQL(tokens, this.sheets);
    const programData = await gsql.programs.find(id);

    if (!programData) {
      return reply.status(404).send({ error: "Program not found or empty" });
    }

    return { program: programData };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch program" });
  }
};

export const updateProgram: RouteHandler<{
  Params: { id: string };
  Body: UpdateProgramRequest;
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { id } = request.params;

  try {
    const gsql = createGSQL(tokens, this.sheets);

    // Support both single update and batch updates
    if (Array.isArray(request.body)) {
      await gsql.programs.updateMany(id, request.body);
    } else {
      await gsql.programs.update(id, request.body);
    }

    return { success: true };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to update program" });
  }
};
