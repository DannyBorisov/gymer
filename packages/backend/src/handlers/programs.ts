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
  DeleteSetParamsType,
  DeleteSetBodyType,
  EditProgramParamsType,
  EditProgramBodyType,
} from "../schemas/programs.js";

export const createProgram: RouteHandler<{
  Body: CreateProgramBodyType;
}> = async function (request) {
  const session = getAuthSession(request);

  const gsql = createGSQL(session);
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
  const session = getAuthSession(request);
  const { id } = request.params;

  try {
    const gsql = createGSQL(session);
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
  const session = getAuthSession(request);

  const gsql = createGSQL(session);
  const programs = await gsql.programs.findAll();
  return { programs };
};

export const getProgram: RouteHandler<{
  Params: GetProgramParamsType;
}> = async function (request, reply) {
  const session = getAuthSession(request);
  const { id } = request.params;

  try {
    const gsql = createGSQL(session);
    const programData = await gsql.programs.find(id);

    if (!programData) {
      return reply.status(404).send({ error: "Program not found or empty" });
    }

    return { program: programData };
  } catch (error) {
    this.log.error(error, `[getProgram] Error fetching program ${id}`);
    return reply.status(500).send({ error: "Failed to fetch program" });
  }
};

export const deleteProgram: RouteHandler<{
  Params: DeleteProgramParamsType;
}> = async function (request, reply) {
  const session = getAuthSession(request);
  const { id } = request.params;

  try {
    const gsql = createGSQL(session);
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
  const session = getAuthSession(request);
  const { id } = request.params;

  try {
    const gsql = createGSQL(session);
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
  const session = getAuthSession(request);
  const { id } = request.params;
  const { name } = request.body ?? {};

  if (!name?.trim()) {
    return reply.status(400).send({ error: "Name is required" });
  }

  try {
    const gsql = createGSQL(session);
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
  const session = getAuthSession(request);
  const { id } = request.params;
  const { week, workoutName, exerciseName, targetReps, targetRir } =
    request.body;

  if (!week || !workoutName || !exerciseName) {
    return reply
      .status(400)
      .send({ error: "week, workoutName, and exerciseName are required" });
  }

  try {
    const gsql = createGSQL(session);
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

export const deleteSet: RouteHandler<{
  Params: DeleteSetParamsType;
  Body: DeleteSetBodyType;
}> = async function (request, reply) {
  const session = getAuthSession(request);
  const { id } = request.params;
  const { week, workoutName, exerciseName, setNumber } = request.body;

  if (!week || !workoutName || !exerciseName || !setNumber) {
    return reply
      .status(400)
      .send({ error: "week, workoutName, exerciseName, and setNumber are required" });
  }

  try {
    const gsql = createGSQL(session);
    await gsql.programs.deleteSet(id, week, workoutName, exerciseName, setNumber);
    const program = await gsql.programs.find(id);

    return { success: true, program };
  } catch (error) {
    this.log.error(error);
    const message = error instanceof Error ? error.message : "Failed to delete set";
    return reply.status(500).send({ error: message });
  }
};

export const updateProgram: RouteHandler<{
  Params: UpdateProgramParamsType;
  Body: UpdateProgramBodyType;
}> = async function (request, reply) {
  const session = getAuthSession(request);
  const { id } = request.params;

  try {
    const gsql = createGSQL(session);

    const updates = Array.isArray(request.body) ? request.body : [request.body];
    console.log('[updateProgram] Received updates:', JSON.stringify(updates, null, 2));
    await gsql.programs.updateMany(id, updates);

    return { success: true };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to update program" });
  }
};
