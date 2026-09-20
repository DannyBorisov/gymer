import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { createGSQL } from "../dal/index.js";
import type {
  CreateProgramBodyType,
  GetProgramParamsType,
  UpdateProgramParamsType,
  UpdateProgramBodyType,
  DeleteProgramParamsType,
  CopyProgramParamsType,
  RenameProgramParamsType,
  RenameProgramBodyType,
  AddSetParamsType,
  AddSetBodyType,
  EditProgramParamsType,
  EditProgramBodyType,
} from "../schemas/programs.js";

export const createProgram: RouteHandler<{
  Body: CreateProgramBodyType;
}> = async function (request) {
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

export const editProgram: RouteHandler<{
  Params: EditProgramParamsType;
  Body: EditProgramBodyType;
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { id } = request.params;

  try {
    const gsql = createGSQL(tokens, this.sheets);
    const program = await gsql.programs.editStructure(id, {
      name: request.body.name,
      durationWeeks: request.body.durationWeeks,
      dynamicRir: request.body.dynamicRir,
      startingRir: request.body.startingRir,
      workouts: request.body.workouts,
      frequency: request.body.frequency,
    });
    return { success: true, program };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to edit program" });
  }
};

export const listPrograms: RouteHandler = async function (request) {
  const { tokens } = getAuthSession(request);

  const gsql = createGSQL(tokens, this.sheets);
  const programs = await gsql.programs.findAll();
  return { programs };
};

export const getProgram: RouteHandler<{
  Params: GetProgramParamsType;
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

export const deleteProgram: RouteHandler<{
  Params: DeleteProgramParamsType;
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { id } = request.params;

  try {
    const gsql = createGSQL(tokens, this.sheets);
    await gsql.programs.delete(id);
    return { success: true };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to delete program" });
  }
};

export const copyProgram: RouteHandler<{
  Params: CopyProgramParamsType;
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { id } = request.params;

  try {
    const gsql = createGSQL(tokens, this.sheets);
    const program = await gsql.programs.copy(id);
    return { success: true, program };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to copy program" });
  }
};

export const renameProgram: RouteHandler<{
  Params: RenameProgramParamsType;
  Body: RenameProgramBodyType;
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { id } = request.params;
  const { name } = request.body ?? {};

  if (!name?.trim()) {
    return reply.status(400).send({ error: "Name is required" });
  }

  try {
    const gsql = createGSQL(tokens, this.sheets);
    const program = await gsql.programs.rename(id, name.trim());
    return { success: true, program };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to rename program" });
  }
};

export const addSet: RouteHandler<{
  Params: AddSetParamsType;
  Body: AddSetBodyType;
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { id } = request.params;
  const { week, workoutName, exerciseName, targetReps, targetRir } =
    request.body;

  if (!week || !workoutName || !exerciseName) {
    return reply
      .status(400)
      .send({ error: "week, workoutName, and exerciseName are required" });
  }

  try {
    const gsql = createGSQL(tokens, this.sheets);
    await gsql.programs.addSet(
      id,
      week,
      workoutName,
      exerciseName,
      targetReps,
      targetRir,
    );
    const program = await gsql.programs.find(id);
    return { success: true, program };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to add set" });
  }
};

export const updateProgram: RouteHandler<{
  Params: UpdateProgramParamsType;
  Body: UpdateProgramBodyType;
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
