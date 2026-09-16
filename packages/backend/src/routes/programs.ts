import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import {
  createProgram,
  listPrograms,
  getProgram,
  updateProgram,
  deleteProgram,
  copyProgram,
  renameProgram,
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

  server.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: requireAuth },
    deleteProgram,
  );

  server.post<{ Params: { id: string } }>(
    "/:id/copy",
    { preHandler: requireAuth },
    copyProgram,
  );

  server.patch<{ Params: { id: string }; Body: { name: string } }>(
    "/:id/rename",
    { preHandler: requireAuth },
    renameProgram,
  );
};

export default ProgramsRoutes;
