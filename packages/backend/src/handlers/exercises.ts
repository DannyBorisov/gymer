import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { createGSQL, prisma } from "../dal/index.js";
import type { CreateExerciseBodyType } from "../schemas/exercises.js";

export const getExercises: RouteHandler = async function (request, reply) {
  const { tokens } = getAuthSession(request);

  const [exercises, userExercises] = await Promise.all([
    prisma.exercises.findAll(),
    createGSQL(tokens, this.sheets).userExercises.findAll(),
  ]);

  const ownExercises = userExercises.map((ex) => ({
    id: `own:${ex.name}`,
    name: ex.name,
    muscleGroup: ex.muscleGroup,
    variant: [],
  }));

  return reply.send({ exercises: [...exercises, ...ownExercises] });
};

export const createExercise: RouteHandler<{
  Body: CreateExerciseBodyType;
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { name, muscleGroup } = request.body;

  const gsql = createGSQL(tokens, this.sheets);
  const exercise = await gsql.userExercises.create({ name, muscleGroup });

  return reply.send({ exercise });
};
