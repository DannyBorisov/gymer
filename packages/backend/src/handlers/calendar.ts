import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { prisma } from "../dal/postgres/index.js";
import type {
  GetCalendarNotesQueryType,
  SaveCalendarNoteBodyType,
  DeleteCalendarNoteParamsType,
} from "../schemas/calendar.js";

export const getCalendarNotes: RouteHandler<{
  Querystring: GetCalendarNotesQueryType;
}> = async function (request, reply) {
  const session = getAuthSession(request);
  if (!session.user?.email) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const { year, month } = request.query;
  const notes = await prisma.calendarNotes.findByMonth(session.user.email, year, month);
  return reply.send({ notes });
};

export const saveCalendarNote: RouteHandler<{
  Body: SaveCalendarNoteBodyType;
}> = async function (request, reply) {
  const session = getAuthSession(request);
  if (!session.user?.email) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const { date, note } = request.body;
  const saved = await prisma.calendarNotes.upsert(session.user.email, { date, note });
  return reply.send({ note: saved });
};

export const deleteCalendarNote: RouteHandler<{
  Params: DeleteCalendarNoteParamsType;
}> = async function (request, reply) {
  const session = getAuthSession(request);
  if (!session.user?.email) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const { date } = request.params;
  await prisma.calendarNotes.delete(session.user.email, date);
  return reply.send({ success: true });
};
