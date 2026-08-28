import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import {
  createProgram,
  listPrograms,
  getProgram,
  updateProgramRows,
} from "../handlers/programs.js";
import type { CreateProgramRequest, UpdateRowsRequest } from "../types.js";

const ProgramsRoutes: FastifyPluginAsync = async (server) => {
  server.get("/", { preHandler: requireAuth }, listPrograms);

  server.post<{ Body: CreateProgramRequest }>(
    "/create",
    { preHandler: requireAuth },
    createProgram,
  );

  server.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: requireAuth },
    getProgram,
  );

  server.patch<{ Params: { id: string }; Body: UpdateRowsRequest }>(
    "/:id/rows",
    { preHandler: requireAuth },
    updateProgramRows,
  );
};

export default ProgramsRoutes;
