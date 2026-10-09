import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import {
  getCalendarNotes,
  saveCalendarNote,
  deleteCalendarNote,
} from "../handlers/calendar.js";
import type {
  GetCalendarNotesQueryType,
  SaveCalendarNoteBodyType,
  DeleteCalendarNoteParamsType,
} from "../schemas/calendar.js";

const CalendarRoutes: FastifyPluginAsync = async (server) => {
  server.get<{ Querystring: GetCalendarNotesQueryType }>(
    "/notes",
    { preHandler: requireAuth },
    getCalendarNotes,
  );

  server.post<{ Body: SaveCalendarNoteBodyType }>(
    "/notes",
    { preHandler: requireAuth },
    saveCalendarNote,
  );

  server.delete<{ Params: DeleteCalendarNoteParamsType }>(
    "/notes/:date",
    { preHandler: requireAuth },
    deleteCalendarNote,
  );
};

export default CalendarRoutes;
