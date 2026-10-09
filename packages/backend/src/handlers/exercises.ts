import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { prisma, MuscleGroup } from "../dal/index.js";
import type { CreateExerciseBodyType } from "../schemas/exercises.js";

export const getExercises: RouteHandler = async function (request, reply) {
  const session = getAuthSession(request);
  const userEmail = session.user?.email;

  const [exercises, userExercises] = await Promise.all([
    prisma.exercises.findAll(),
    userEmail ? prisma.userExercises.findByUser(userEmail) : [],
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
  const session = getAuthSession(request);
  const userEmail = session.user?.email;
  if (!userEmail) {
    return reply.status(401).send({ error: "User email required" });
  }

  const { name, muscleGroup } = request.body;

  const exercise = await prisma.userExercises.create(userEmail, {
    name,
    muscleGroup: muscleGroup as MuscleGroup,
  });

  return reply.send({ exercise: { name: exercise.name, muscleGroup: exercise.muscleGroup } });
};
