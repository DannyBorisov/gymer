import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../middlewares/auth.js";
import {
  createProgram,
  editProgram,
  listPrograms,
  getProgram,
  updateProgram,
  deleteProgram,
  copyProgram,
  renameProgram,
  addSet,
  deleteSet,
} from "../handlers/programs.js";
import type {
  CreateProgramBodyType,
  EditProgramParamsType,
  EditProgramBodyType,
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

  server.put<{ Params: EditProgramParamsType; Body: EditProgramBodyType }>(
    "/:id",
    { preHandler: requireAuth },
    editProgram,
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

  server.post<{ Params: DeleteSetParamsType; Body: DeleteSetBodyType }>(
    "/:id/delete-set",
    { preHandler: requireAuth },
    deleteSet,
  );
};

export default ProgramsRoutes;
