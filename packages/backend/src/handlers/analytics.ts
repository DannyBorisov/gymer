import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { createGSQL } from "../dal/index.js";
import { formatDate } from "../dal/utils/dateUtils.js";

export const getExerciseBests: RouteHandler = async function (request, reply) {
  const { tokens } = getAuthSession(request);

  try {
    const gsql = createGSQL(tokens, this.sheets);
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
  const { tokens } = getAuthSession(request);

  try {
    const gsql = createGSQL(tokens, this.sheets);
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
