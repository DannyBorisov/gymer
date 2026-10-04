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
  UpdateProgramCacheParamsType,
  UpdateProgramCacheBodyType,
} from "../schemas/programs.js";

export const createProgram: RouteHandler<{
  Body: CreateProgramBodyType;
}> = async function (request) {
  const session = getAuthSession(request);

  // Creating a program structure - sync to Sheets to persist
  const gsql = createGSQL(session, this.sheets, { syncToSheets: true });
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
    // Editing program structure - sync to Sheets to persist
    const gsql = createGSQL(session, this.sheets, { syncToSheets: true });
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

  const gsql = createGSQL(session, this.sheets);
  const programs = await gsql.programs.findAll();
  return { programs };
};

export const getProgram: RouteHandler<{
  Params: GetProgramParamsType;
}> = async function (request, reply) {
  const session = getAuthSession(request);
  const { id } = request.params;

  try {
    const gsql = createGSQL(session, this.sheets);
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
    // Deleting program - sync to Sheets to persist
    const gsql = createGSQL(session, this.sheets, { syncToSheets: true });
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
    // Copying program - sync to Sheets to persist
    const gsql = createGSQL(session, this.sheets, { syncToSheets: true });
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
    // Renaming program - sync to Sheets to persist
    const gsql = createGSQL(session, this.sheets, { syncToSheets: true });
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
    // Adding set to program structure - sync to Sheets to persist
    const gsql = createGSQL(session, this.sheets, { syncToSheets: true });
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
    const gsql = createGSQL(session, this.sheets, { syncToSheets: true });
    await gsql.programs.deleteSet(id, week, workoutName, exerciseName, setNumber);
    const program = await gsql.programs.find(id);

    return { success: true, program };
  } catch (error) {
    this.log.error(error);
    const message = error instanceof Error ? error.message : "Failed to delete set";
    return reply.status(500).send({ error: message });
  }
};

/**
 * Cache-only update - writes to cache, no Sheets sync.
 * Used during active workout (every 5 seconds) to avoid Sheets quota.
 */
export const updateProgramCache: RouteHandler<{
  Params: UpdateProgramCacheParamsType;
  Body: UpdateProgramCacheBodyType;
}> = async function (request, reply) {
  const session = getAuthSession(request);
  const { id } = request.params;

  if (!session.user?.email) {
    return reply.status(401).send({ error: "User email required for cache" });
  }

  try {
    // Cache only - no Sheets sync
    const gsql = createGSQL(session, this.sheets, { syncToSheets: false });

    const updates = Array.isArray(request.body) ? request.body : [request.body];
    await gsql.programs.updateMany(id, updates);

    return { success: true };
  } catch (error) {
    this.log.error(error, "[updateProgramCache] Error");
    return reply.status(500).send({ error: "Failed to update program cache" });
  }
};

/**
 * Full update - writes to cache AND syncs to Google Sheets.
 * Used on workout completion to persist data to Sheets.
 */
export const updateProgram: RouteHandler<{
  Params: UpdateProgramParamsType;
  Body: UpdateProgramBodyType;
}> = async function (request, reply) {
  const session = getAuthSession(request);
  const { id } = request.params;

  try {
    // Full sync to Sheets
    const gsql = createGSQL(session, this.sheets, { syncToSheets: true });

    const updates = Array.isArray(request.body) ? request.body : [request.body];
    await gsql.programs.updateMany(id, updates);

    return { success: true };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to update program" });
  }
};
