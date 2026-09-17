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
  addSet,
} from "../handlers/programs.js";
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
} from "../schemas/programs.js";

const ProgramsRoutes: FastifyPluginAsync = async (server) => {
  server.get("/", { preHandler: requireAuth }, listPrograms);

  server.post<{ Body: CreateProgramBodyType }>(
    "/create",
    { preHandler: requireAuth },
    createProgram,
  );

  server.get<{ Params: GetProgramParamsType }>(
    "/:id",
    { preHandler: requireAuth },
    getProgram,
  );

  server.patch<{ Params: UpdateProgramParamsType; Body: UpdateProgramBodyType }>(
    "/:id",
    { preHandler: requireAuth },
    updateProgram,
  );

  server.delete<{ Params: DeleteProgramParamsType }>(
    "/:id",
    { preHandler: requireAuth },
    deleteProgram,
  );

  server.post<{ Params: CopyProgramParamsType }>(
    "/:id/copy",
    { preHandler: requireAuth },
    copyProgram,
  );

  server.patch<{ Params: RenameProgramParamsType; Body: RenameProgramBodyType }>(
    "/:id/rename",
    { preHandler: requireAuth },
    renameProgram,
  );

  server.post<{ Params: AddSetParamsType; Body: AddSetBodyType }>(
    "/:id/add-set",
    { preHandler: requireAuth },
    addSet,
  );
};

export default ProgramsRoutes;
