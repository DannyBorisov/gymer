import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { createGSQL } from "../dal/index.js";
import { formatDate } from "../dal/gsql/utils/dateUtils.js";

export const getExerciseBests: RouteHandler = async function (request, reply) {
  const session = getAuthSession(request);

  try {
    const gsql = createGSQL(session, this.sheets);
    const bests = await gsql.analytics.getBests();
    return { bests };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch exercise bests" });
  }
};

export const getExerciseProgression: RouteHandler = async function (
  request,
  reply,
) {
  const session = getAuthSession(request);

  try {
    const gsql = createGSQL(session, this.sheets);
    const progressionData = await gsql.analytics.getProgression();

    // Format dates as strings for API response
    const exercises = progressionData.map((ex) => ({
      exercise: ex.exercise,
      entries: ex.entries.map((entry) => ({
        date: formatDate(entry.date),
        weight: entry.weight,
        reps: entry.reps,
        sets: entry.sets,
        e1rm: entry.e1rm,
      })),
    }));

    return { exercises };
  } catch (error) {
    this.log.error(error);
    return reply
      .status(500)
      .send({ error: "Failed to fetch exercise progression" });
  }
};

export const getAnalyticsSummary: RouteHandler = async function (
  request,
  reply,
) {
  const session = getAuthSession(request);

  try {
    const gsql = createGSQL(session, this.sheets);
    const summary = await gsql.analytics.getSummary();
    return { summary };
  } catch (error) {
    this.log.error(error);
    return reply
      .status(500)
      .send({ error: "Failed to fetch analytics summary" });
  }
};

export const getPersonalRecords: RouteHandler = async function (
  request,
  reply,
) {
  const session = getAuthSession(request);

  try {
    const gsql = createGSQL(session, this.sheets);
    const records = await gsql.analytics.getPersonalRecords();
    return { records };
  } catch (error) {
    this.log.error(error);
    return reply
      .status(500)
      .send({ error: "Failed to fetch personal records" });
  }
};

export const getWorkoutConsistency: RouteHandler = async function (
  request,
  reply,
) {
  const session = getAuthSession(request);

  try {
    const gsql = createGSQL(session, this.sheets);
    const consistency = await gsql.analytics.getWorkoutConsistency();
    return { consistency };
  } catch (error) {
    this.log.error(error);
    return reply
      .status(500)
      .send({ error: "Failed to fetch workout consistency" });
  }
};

export const getMuscleGroupVolume: RouteHandler = async function (
  request,
  reply,
) {
  const session = getAuthSession(request);
  const query = request.query as { period?: "week" | "month" };
  const period = query.period || "week";

  try {
    const gsql = createGSQL(session, this.sheets);
    const volume = await gsql.analytics.getMuscleGroupVolume(period);
    return { volume };
  } catch (error) {
    this.log.error(error);
    return reply
      .status(500)
      .send({ error: "Failed to fetch muscle group volume" });
  }
};

export const getMuscleRecovery: RouteHandler = async function (request, reply) {
  const session = getAuthSession(request);

  try {
    const gsql = createGSQL(session, this.sheets);
    const recovery = await gsql.analytics.getMuscleRecovery();
    return { recovery };
  } catch (error) {
    this.log.error(error);
    return reply
      .status(500)
      .send({ error: "Failed to fetch muscle recovery" });
  }
};
