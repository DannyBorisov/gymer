import type { Program } from "../types/program";

export const phulProgram: Program = {
  name: "PHUL (Power Hypertrophy Upper Lower)",
  durationWeeks: 12,
  frequency: 4,
  dynamicRir: true,
  startingRir: 3,
  workouts: [
    {
      name: "Upper Power",
      exercises: [
        { name: "Barbell Bench Press", sets: 4, reps: 5, rir: 2 },
        { name: "Barbell Row", sets: 4, reps: 5, rir: 2 },
        { name: "Overhead Press", sets: 3, reps: 6, rir: 2 },
        { name: "Weighted Pull-Up", sets: 3, reps: 6, rir: 2 },
        { name: "Barbell Curl", sets: 3, reps: 8, rir: 2 },
        { name: "Barbell Skull Crusher", sets: 3, reps: 8, rir: 2 },
      ],
    },
    {
      name: "Lower Power",
      exercises: [
        { name: "Barbell Squat", sets: 4, reps: 5, rir: 2 },
        { name: "Deadlift", sets: 4, reps: 5, rir: 2 },
        { name: "Leg Press", sets: 3, reps: 8, rir: 2 },
        { name: "Leg Curl", sets: 3, reps: 8, rir: 2 },
        { name: "Machine Calf Raise", sets: 4, reps: 10, rir: 2 },
      ],
    },
    {
      name: "Upper Hypertrophy",
      exercises: [
        { name: "Dumbbell Incline Bench Press", sets: 4, reps: 12, rir: 2 },
        { name: "Cable Row", sets: 4, reps: 12, rir: 2 },
        { name: "Dumbbell Lateral Raise", sets: 4, reps: 15, rir: 2 },
        { name: "Lat Pulldown", sets: 4, reps: 12, rir: 2 },
        { name: "Dumbbell Bicep Curl", sets: 3, reps: 12, rir: 2 },
        { name: "Cable Tricep Pushdown", sets: 3, reps: 12, rir: 2 },
        { name: "Cable Face Pull", sets: 3, reps: 15, rir: 2 },
      ],
    },
    {
      name: "Lower Hypertrophy",
      exercises: [
        { name: "Barbell Front Squat", sets: 4, reps: 10, rir: 2 },
        { name: "Romanian Deadlift", sets: 3, reps: 10, rir: 2 },
        { name: "Leg Extension", sets: 4, reps: 15, rir: 2 },
        { name: "Leg Curl", sets: 4, reps: 15, rir: 2 },
        { name: "Machine Seated Calf Raise", sets: 4, reps: 15, rir: 2 },
      ],
    },
  ],
};

export const startingStrengthProgram: Program = {
  name: "Starting Strength",
  durationWeeks: 12,
  frequency: 3,
  dynamicRir: false,
  startingRir: 1,
  workouts: [
    {
      name: "Workout A",
      exercises: [
        { name: "Barbell Squat", sets: 3, reps: 5, rir: 1 },
        { name: "Bench Press", sets: 3, reps: 5, rir: 1 },
        { name: "Deadlift", sets: 1, reps: 5, rir: 1 },
      ],
    },
    {
      name: "Workout B",
      exercises: [
        { name: "Barbell Squat", sets: 3, reps: 5, rir: 1 },
        { name: "Overhead Press", sets: 3, reps: 5, rir: 1 },
        { name: "Barbell Row", sets: 3, reps: 5, rir: 1 },
      ],
    },
  ],
};

export const fullBody3xProgram: Program = {
  name: "Full Body 3x",
  durationWeeks: 8,
  frequency: 3,
  dynamicRir: true,
  startingRir: 3,
  workouts: [
    {
      name: "Day A",
      exercises: [
        { name: "Barbell Squat", sets: 4, reps: 8, rir: 2 },
        { name: "Bench Press", sets: 4, reps: 8, rir: 2 },
        { name: "Barbell Row", sets: 4, reps: 8, rir: 2 },
        { name: "Dumbbell Lateral Raise", sets: 3, reps: 12, rir: 2 },
        { name: "Barbell Curl", sets: 3, reps: 10, rir: 2 },
        { name: "Cable Tricep Pushdown", sets: 3, reps: 10, rir: 2 },
      ],
    },
    {
      name: "Day B",
      exercises: [
        { name: "Romanian Deadlift", sets: 4, reps: 8, rir: 2 },
        { name: "Overhead Press", sets: 4, reps: 8, rir: 2 },
        { name: "Weighted Pull-Up", sets: 4, reps: 8, rir: 2 },
        { name: "Leg Curl", sets: 3, reps: 12, rir: 2 },
        { name: "Cable Face Pull", sets: 3, reps: 15, rir: 2 },
        { name: "Machine Calf Raise", sets: 4, reps: 12, rir: 2 },
      ],
    },
    {
      name: "Day C",
      exercises: [
        { name: "Barbell Front Squat", sets: 4, reps: 8, rir: 2 },
        { name: "Dumbbell Incline Bench Press", sets: 4, reps: 10, rir: 2 },
        { name: "Cable Row", sets: 4, reps: 10, rir: 2 },
        { name: "Dumbbell Shoulder Press", sets: 3, reps: 10, rir: 2 },
        { name: "Hammer Curl", sets: 3, reps: 10, rir: 2 },
        { name: "Cable Rope Overhead Tricep Extension", sets: 3, reps: 10, rir: 2 },
      ],
    },
  ],
};

export const pplProgram: Program = {
  name: "Push Pull Legs",
  durationWeeks: 10,
  frequency: 6,
  dynamicRir: true,
  startingRir: 3,
  workouts: [
    {
      name: "Push",
      exercises: [
        { name: "Bench Press", sets: 4, reps: 8, rir: 2 },
        { name: "Overhead Press", sets: 4, reps: 8, rir: 2 },
        { name: "Dumbbell Incline Bench Press", sets: 3, reps: 10, rir: 2 },
        { name: "Dumbbell Lateral Raise", sets: 4, reps: 12, rir: 2 },
        { name: "Cable Tricep Pushdown", sets: 3, reps: 12, rir: 2 },
        { name: "Cable Rope Overhead Tricep Extension", sets: 3, reps: 12, rir: 2 },
      ],
    },
    {
      name: "Pull",
      exercises: [
        { name: "Barbell Row", sets: 4, reps: 8, rir: 2 },
        { name: "Weighted Pull-Up", sets: 4, reps: 8, rir: 2 },
        { name: "Cable Row", sets: 3, reps: 10, rir: 2 },
        { name: "Cable Face Pull", sets: 4, reps: 15, rir: 2 },
        { name: "Barbell Curl", sets: 3, reps: 10, rir: 2 },
        { name: "Hammer Curl", sets: 3, reps: 10, rir: 2 },
      ],
    },
    {
      name: "Legs",
      exercises: [
        { name: "Barbell Squat", sets: 4, reps: 8, rir: 2 },
        { name: "Romanian Deadlift", sets: 4, reps: 8, rir: 2 },
        { name: "Leg Press", sets: 3, reps: 12, rir: 2 },
        { name: "Leg Curl", sets: 4, reps: 12, rir: 2 },
        { name: "Leg Extension", sets: 3, reps: 12, rir: 2 },
        { name: "Machine Calf Raise", sets: 4, reps: 15, rir: 2 },
      ],
    },
  ],
};

export const upperLowerProgram: Program = {
  name: "Upper Lower 4x",
  durationWeeks: 10,
  frequency: 4,
  dynamicRir: true,
  startingRir: 3,
  workouts: [
    {
      name: "Upper A",
      exercises: [
        { name: "Bench Press", sets: 4, reps: 6, rir: 2 },
        { name: "Barbell Row", sets: 4, reps: 6, rir: 2 },
        { name: "Overhead Press", sets: 3, reps: 8, rir: 2 },
        { name: "Lat Pulldown", sets: 3, reps: 10, rir: 2 },
        { name: "Dumbbell Bicep Curl", sets: 3, reps: 10, rir: 2 },
        { name: "Cable Tricep Pushdown", sets: 3, reps: 10, rir: 2 },
      ],
    },
    {
      name: "Lower A",
      exercises: [
        { name: "Barbell Squat", sets: 4, reps: 6, rir: 2 },
        { name: "Romanian Deadlift", sets: 4, reps: 8, rir: 2 },
        { name: "Leg Press", sets: 3, reps: 10, rir: 2 },
        { name: "Leg Curl", sets: 3, reps: 10, rir: 2 },
        { name: "Machine Calf Raise", sets: 4, reps: 12, rir: 2 },
      ],
    },
    {
      name: "Upper B",
      exercises: [
        { name: "Dumbbell Incline Bench Press", sets: 4, reps: 8, rir: 2 },
        { name: "Cable Row", sets: 4, reps: 8, rir: 2 },
        { name: "Dumbbell Shoulder Press", sets: 3, reps: 10, rir: 2 },
        { name: "Weighted Pull-Up", sets: 3, reps: 8, rir: 2 },
        { name: "Hammer Curl", sets: 3, reps: 12, rir: 2 },
        { name: "Barbell Skull Crusher", sets: 3, reps: 12, rir: 2 },
      ],
    },
    {
      name: "Lower B",
      exercises: [
        { name: "Deadlift", sets: 4, reps: 5, rir: 2 },
        { name: "Barbell Front Squat", sets: 3, reps: 8, rir: 2 },
        { name: "Hip Thrust", sets: 3, reps: 10, rir: 2 },
        { name: "Leg Extension", sets: 3, reps: 12, rir: 2 },
        { name: "Machine Seated Calf Raise", sets: 4, reps: 15, rir: 2 },
      ],
    },
  ],
};

export const presets = [
  {
    id: "starting-strength",
    name: "Starting Strength",
    description: "3x5 beginner program",
    program: startingStrengthProgram,
  },
  {
    id: "full-body",
    name: "Full Body",
    description: "3-day full body",
    program: fullBody3xProgram,
  },
  {
    id: "upper-lower",
    name: "Upper/Lower",
    description: "4-day split",
    program: upperLowerProgram,
  },
  {
    id: "ppl",
    name: "PPL",
    description: "6-day Push Pull Legs",
    program: pplProgram,
  },
  {
    id: "phul",
    name: "PHUL",
    description: "4-day Power Hypertrophy",
    program: phulProgram,
  },
];
