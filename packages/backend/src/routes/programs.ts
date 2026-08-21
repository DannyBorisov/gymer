import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import {
  createProgram,
  listPrograms,
  getProgram,
  updateProgramRows,
} from "../handlers/programs.js";
import type { CreateProgramRequest, UpdateRowsRequest } from "../types.js";

// POST /api/program/create
export const programCreateRoute: FastifyPluginAsync = async (server) => {
  server.post<{ Body: CreateProgramRequest }>(
    "/create",
    { preHandler: requireAuth },
    createProgram,
  );
};

// GET /api/programs, GET /api/programs/:id, PATCH /api/programs/:id/rows
export const programsRoutes: FastifyPluginAsync = async (server) => {
  server.get("/", { preHandler: requireAuth }, listPrograms);

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
