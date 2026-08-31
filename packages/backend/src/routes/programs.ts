import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import {
  createProgram,
  listPrograms,
  getProgram,
  updateProgram,
} from "../handlers/programs.js";
import type { CreateProgramRequest, UpdateProgramRequest } from "../types.js";

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

  server.patch<{ Params: { id: string }; Body: UpdateProgramRequest }>(
    "/:id",
    { preHandler: requireAuth },
    updateProgram,
  );
};

export default ProgramsRoutes;
